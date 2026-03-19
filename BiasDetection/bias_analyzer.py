#!/usr/bin/env python3
"""
Bias Analysis Pipeline with Interactive Knowledge Graph
========================================================
Dependencies (install via pip):
    pip install spacy sentence-transformers transformers torch umap-learn hdbscan pandas 
    pip install trafilatura requests pyvis tqdm numpy scikit-learn

Then download spacy model:
    python -m spacy download en_core_web_trf
"""

import os
import sys
import re
import json
import warnings
import webbrowser
from pathlib import Path
from collections import defaultdict, Counter
from typing import List, Dict, Tuple, Optional

import numpy as np
import pandas as pd
from tqdm import tqdm

# NLP libraries
import spacy
from spacy.cli import download as spacy_download

# Embedding and clustering
from sentence_transformers import SentenceTransformer
import umap
import hdbscan

# Sentiment analysis
from transformers import pipeline

# Web scraping
import requests
from trafilatura import extract, fetch_url

# Visualization
from pyvis.network import Network

warnings.filterwarnings('ignore')


class BiasAnalyzer:
    """Complete bias analysis pipeline for news articles."""
    
    def __init__(self):
        self.articles = []
        self.sentences = []
        self.embeddings = None
        self.clusters = None
        self.entities = []
        self.results = []
        
        # Initialize models
        print("🔧 Initializing models...")
        self._load_spacy()
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            top_k=None
        )
        print("✅ Models loaded!\n")
    
    def _load_spacy(self):
        """Load spacy model, download if not available."""
        try:
            self.nlp = spacy.load("en_core_web_trf")
        except OSError:
            print("📥 Downloading spacy model en_core_web_trf (this may take a few minutes)...")
            spacy_download("en_core_web_trf")
            self.nlp = spacy.load("en_core_web_trf")
    
    def load_data(self, input_path: Optional[str] = None):
        """Load articles from folder, CSV, or download samples."""
        print("📂 Loading data...")
        
        if input_path is None:
            # Download sample articles
            print("   No input provided. Downloading 10 sample articles about climate change...")
            self._download_sample_articles()
        elif os.path.isdir(input_path):
            # Load from folder of text files
            txt_files = list(Path(input_path).glob("*.txt"))
            for file_path in tqdm(txt_files, desc="   Reading text files"):
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                    self.articles.append({
                        'title': file_path.stem,
                        'text': self._clean_text(text),
                        'source': str(file_path)
                    })
        elif input_path.endswith('.csv'):
            # Load from CSV
            df = pd.read_csv(input_path)
            required_cols = ['text']
            if not all(col in df.columns for col in required_cols):
                raise ValueError(f"CSV must contain 'text' column. Found: {df.columns.tolist()}")
            
            for idx, row in tqdm(df.iterrows(), total=len(df), desc="   Reading CSV"):
                self.articles.append({
                    'title': row.get('title', f'Article_{idx}'),
                    'text': self._clean_text(str(row['text'])),
                    'source': row.get('url', f'row_{idx}')
                })
        else:
            raise ValueError("Input must be a folder path, CSV file, or None for sample data")
        
        print(f"✅ Loaded {len(self.articles)} articles\n")
    
    def _download_sample_articles(self):
        """Download sample news articles using trafilatura."""
        # Sample URLs about climate change from reputable sources
        sample_urls = [
            "https://www.bbc.com/news/science-environment",
            "https://www.theguardian.com/environment/climate-crisis",
            "https://www.nature.com/subjects/climate-change",
            "https://www.scientificamerican.com/climate/",
            "https://www.nationalgeographic.com/environment/climate-change/",
            "https://www.npr.org/sections/climate/",
            "https://www.reuters.com/business/environment/",
            "https://apnews.com/hub/climate-and-environment",
            "https://www.pbs.org/newshour/tag/climate-change",
            "https://www.ipcc.ch/",
        ]
        
        count = 0
        for url in tqdm(sample_urls, desc="   Downloading articles"):
            if count >= 10:
                break
            try:
                downloaded = fetch_url(url)
                if downloaded:
                    text = extract(downloaded)
                    if text and len(text) > 200:
                        self.articles.append({
                            'title': f'Climate Article {count+1}',
                            'text': self._clean_text(text),
                            'source': url
                        })
                        count += 1
            except Exception as e:
                continue
        
        # Fallback: create synthetic articles if downloads fail
        if len(self.articles) < 3:
            print("   ⚠️  Download failed. Using synthetic sample data...")
            self._create_synthetic_articles()
    
    def _create_synthetic_articles(self):
        """Create synthetic articles for demo purposes."""
        synthetic = [
            {
                'title': 'Climate Summit Results',
                'text': 'United Nations officials met in Geneva to discuss climate policy. Secretary General Antonio Guterres emphasized urgent action. The European Union pledged significant funding. China and India presented new emissions targets. Environmental groups praised the initiative while corporations expressed concerns about implementation costs.',
                'source': 'synthetic_1'
            },
            {
                'title': 'Renewable Energy Progress',
                'text': 'Tesla announced new solar panel technology in California. The innovation could reduce costs by thirty percent. Elon Musk stated that sustainable energy is economically viable. Germany and Denmark are leading adoption in Europe. Scientists from MIT validated the efficiency claims.',
                'source': 'synthetic_2'
            },
            {
                'title': 'Arctic Ice Study',
                'text': 'Research from Cambridge University shows accelerating ice melt in Greenland. Professor Sarah Johnson led the international team. The findings were published in Nature Climate Change. NASA satellite data confirmed the trends. Greenland ice loss has tripled since the 1990s according to the report.',
                'source': 'synthetic_3'
            },
            {
                'title': 'Corporate Climate Commitments',
                'text': 'Amazon and Microsoft announced carbon neutrality goals. Jeff Bezos pledged ten billion dollars through the Bezos Earth Fund. Google has been carbon neutral since 2007. Apple plans to be carbon negative by 2030. Environmental advocates question if these commitments are sufficient.',
                'source': 'synthetic_4'
            },
            {
                'title': 'Climate Protests Worldwide',
                'text': 'Greta Thunberg led protests in Stockholm demanding climate action. Thousands joined demonstrations in London, Paris, and New York. Extinction Rebellion activists blocked streets in major cities. Politicians faced pressure to accelerate policy changes. Young activists emphasized intergenerational justice.',
                'source': 'synthetic_5'
            },
            {
                'title': 'IPCC Warning Report',
                'text': 'The Intergovernmental Panel on Climate Change released dire warnings about global temperature rise. Lead author Dr. Michael Chen stated that immediate action is critical. The report analyzed data from over 190 countries. United States and China are the largest emitters. Small island nations face existential threats.',
                'source': 'synthetic_6'
            },
            {
                'title': 'Green New Deal Debate',
                'text': 'Senator Bernie Sanders and Representative Alexandria Ocasio-Cortez proposed comprehensive climate legislation. The plan includes renewable energy investments and job creation. Republicans criticized the cost estimates. The fossil fuel industry lobbied against the proposal. Labor unions showed mixed reactions to the transition plans.',
                'source': 'synthetic_7'
            },
            {
                'title': 'Australia Wildfire Crisis',
                'text': 'Devastating wildfires swept across Australia killing wildlife and destroying homes. Prime Minister Scott Morrison faced criticism for climate inaction. Sydney experienced hazardous air quality levels. Scientists linked the fires to climate change and drought. International firefighters assisted Australian crews in battling the blazes.',
                'source': 'synthetic_8'
            },
            {
                'title': 'Clean Energy Investment',
                'text': 'Bill Gates invested in nuclear energy startups through Breakthrough Energy. The World Bank announced funding for developing nations. Solar energy became cheaper than coal in most markets. BlackRock shifted investment strategy toward sustainable companies. Oil companies like BP and Shell rebranded as energy companies.',
                'source': 'synthetic_9'
            },
            {
                'title': 'Climate Science Consensus',
                'text': 'Over ninety-seven percent of climate scientists agree on human-caused warming. Dr. James Hansen pioneered climate modeling at NASA. The Royal Society confirmed the scientific consensus. Peer-reviewed research in journals like Science and Nature supports the findings. Misinformation campaigns have sowed public doubt despite overwhelming evidence.',
                'source': 'synthetic_10'
            }
        ]
        self.articles = synthetic
    
    def _clean_text(self, text: str) -> str:
        """Normalize and clean text."""
        if not text:
            return ""
        # Normalize unicode
        text = text.encode('utf-8', 'ignore').decode('utf-8')
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def process_articles(self):
        """Extract sentences and named entities."""
        print("🔍 Processing articles (NER + sentence splitting)...")
        
        for article in tqdm(self.articles, desc="   Analyzing"):
            doc = self.nlp(article['text'])
            
            # Extract sentences
            for sent in doc.sents:
                sent_text = sent.text.strip()
                if len(sent_text) > 10:  # Skip very short sentences
                    sent_entities = []
                    for ent in sent.ents:
                        if ent.label_ in ['PERSON', 'ORG', 'GPE']:
                            sent_entities.append({
                                'text': ent.text,
                                'label': ent.label_
                            })
                    
                    self.sentences.append({
                        'text': sent_text,
                        'entities': sent_entities,
                        'article_title': article['title'],
                        'source': article['source']
                    })
        
        print(f"✅ Extracted {len(self.sentences)} sentences\n")
    
    def generate_embeddings(self):
        """Generate sentence embeddings."""
        print("🧠 Generating embeddings...")
        texts = [s['text'] for s in self.sentences]
        self.embeddings = self.embedder.encode(
            texts,
            show_progress_bar=True,
            batch_size=32
        )
        print(f"✅ Generated embeddings: {self.embeddings.shape}\n")
    
    def cluster_sentences(self):
        """Cluster sentences using UMAP + HDBSCAN."""
        print("📊 Clustering sentences...")
        
        # Dimensionality reduction
        print("   Running UMAP...")
        reducer = umap.UMAP(
            n_neighbors=15,
            min_dist=0.0,
            metric='cosine',
            random_state=42
        )
        reduced_embeddings = reducer.fit_transform(self.embeddings)
        
        # Clustering
        print("   Running HDBSCAN...")
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=5,
            metric='euclidean',
            cluster_selection_method='eom'
        )
        self.clusters = clusterer.fit_predict(reduced_embeddings)
        
        n_clusters = len(set(self.clusters)) - (1 if -1 in self.clusters else 0)
        n_noise = list(self.clusters).count(-1)
        print(f"✅ Found {n_clusters} clusters ({n_noise} noise points)\n")
    
    def analyze_bias(self):
        """Compute bias scores and sentiment for entity-cluster pairs."""
        print("🎯 Analyzing bias...")
        
        # Global entity counts
        global_entity_counts = Counter()
        for sent in self.sentences:
            for ent in sent['entities']:
                global_entity_counts[ent['text']] += 1
        
        total_entity_mentions = sum(global_entity_counts.values())
        
        # Cluster-specific analysis
        cluster_data = defaultdict(lambda: {
            'sentences': [],
            'entity_counts': Counter(),
            'entity_labels': {}
        })
        
        for idx, (sent, cluster_id) in enumerate(zip(self.sentences, self.clusters)):
            cluster_data[cluster_id]['sentences'].append(sent['text'])
            for ent in sent['entities']:
                cluster_data[cluster_id]['entity_counts'][ent['text']] += 1
                cluster_data[cluster_id]['entity_labels'][ent['text']] = ent['label']
        
        # Compute bias scores and sentiment
        bias_results = []
        
        for cluster_id, data in tqdm(cluster_data.items(), desc="   Computing bias"):
            if cluster_id == -1:  # Skip noise
                continue
            
            cluster_total_entities = sum(data['entity_counts'].values())
            
            for entity, count in data['entity_counts'].items():
                if count < 2:  # Skip rare entities
                    continue
                
                # Calculate bias using multiple factors
                # 1. Relative frequency in this cluster
                cluster_freq = count / len(data['sentences'])
                
                # 2. How concentrated the entity is in this cluster vs others
                total_entity_mentions = global_entity_counts[entity]
                concentration = count / total_entity_mentions
                
                # 3. How unique this entity is to this cluster
                clusters_with_entity = sum(
                    1 for c_id, c_data in cluster_data.items()
                    if c_id != -1 and entity in c_data['entity_counts']
                )
                uniqueness = 1.0 / max(1, clusters_with_entity)
                
                # 4. Adjust for cluster size - smaller clusters need higher threshold
                cluster_size_factor = min(1.0, len(data['sentences']) / 20)
                
                # Combine factors with weights
                # Higher concentration and uniqueness = higher bias
                # But must appear frequently enough in cluster to matter
                bias_score = (
                    0.4 * concentration +  # How much of entity's mentions are in this cluster
                    0.3 * uniqueness +     # How few clusters contain this entity
                    0.3 * cluster_freq     # How frequently it appears in this cluster
                ) * cluster_size_factor    # Adjust for cluster size
                
                # Ensure reasonable range
                if count < 2 or len(data['sentences']) < 5:
                    bias_score = 0.0
                else:
                    # Scale down high scores to make them harder to achieve
                    bias_score = np.power(bias_score, 1.5)
                
                # Sentiment analysis for sentences containing this entity
                entity_sentences = [
                    s['text'] for s in self.sentences 
                    if cluster_id == self.clusters[self.sentences.index(s)]
                    and any(e['text'] == entity for e in s['entities'])
                ]
                
                if entity_sentences:
                    # Sample up to 10 sentences for efficiency
                    sample_sentences = entity_sentences[:10]
                    sentiments = []
                    
                    for sent_text in sample_sentences:
                        try:
                            results = self.sentiment_analyzer(sent_text[:512])[0]
                            # Calculate sentiment score with better neutral handling
                            for result in results:
                                if result['label'].lower() == 'neutral':
                                    sentiments.append(0.0)  # Explicitly neutral
                                elif result['label'].lower() == 'positive':
                                    # Scale positive sentiment to 0 to 1 range
                                    sentiments.append(result['score'] * 0.5)  # Dampen positive scores
                                elif result['label'].lower() == 'negative':
                                    # Scale negative sentiment to -1 to 0 range
                                    sentiments.append(-result['score'] * 0.5)  # Dampen negative scores
                        except Exception as e:
                            continue
                    
                    # Average sentiments with stronger neutral bias
                    if sentiments:
                        # Apply sigmoid-like smoothing to push mild sentiments towards neutral
                        avg_raw = np.mean(sentiments)
                        avg_sentiment = np.tanh(avg_raw)  # Squashes to [-1, 1] with more values near 0
                    else:
                        avg_sentiment = 0
                else:
                    avg_sentiment = 0
                
                bias_results.append({
                    'entity': entity,
                    'entity_type': data['entity_labels'][entity],
                    'cluster': cluster_id,
                    'mentions': count,
                    'bias_score': bias_score,
                    'sentiment': avg_sentiment,
                    'cluster_size': len(data['sentences'])
                })
        
        self.results = sorted(bias_results, key=lambda x: x['bias_score'], reverse=True)
        print(f"✅ Analyzed {len(self.results)} entity-cluster pairs\n")
    
    def create_knowledge_graph(self, output_file: str = "bias_knowledge_graph.html"):
        """Generate interactive knowledge graph with PyVis."""
        print("🕸️  Creating knowledge graph...")
        
        net = Network(
            height="900px",
            width="100%",
            bgcolor="#1a1a1a",
            font_color="white",
            notebook=False
        )
        
        # Configure physics
        net.set_options("""
        {
          "physics": {
            "forceAtlas2Based": {
              "gravitationalConstant": -50,
              "centralGravity": 0.01,
              "springLength": 200,
              "springConstant": 0.08
            },
            "maxVelocity": 50,
            "solver": "forceAtlas2Based",
            "timestep": 0.35,
            "stabilization": {"iterations": 150}
          }
        }
        """)
        
        # Add cluster nodes
        cluster_ids = set(self.clusters) - {-1}
        cluster_sentences = defaultdict(list)
        cluster_sentiments = defaultdict(list)
        
        for idx, cluster_id in enumerate(self.clusters):
            if cluster_id != -1:
                cluster_sentences[cluster_id].append(self.sentences[idx]['text'])
                # Get sentiment for cluster
                try:
                    sent_result = self.sentiment_analyzer(self.sentences[idx]['text'][:512])[0]
                    for item in sent_result:
                        if item['label'].lower() == 'positive':
                            cluster_sentiments[cluster_id].append(item['score'])
                        elif item['label'].lower() == 'negative':
                            cluster_sentiments[cluster_id].append(-item['score'])
                except:
                    pass
        
        for cluster_id in cluster_ids:
            size = len(cluster_sentences[cluster_id])
            avg_sent = np.mean(cluster_sentiments[cluster_id]) if cluster_sentiments[cluster_id] else 0
            
            # Color by sentiment
            if avg_sent > 0.1:
                color = "#22c55e"  # Green for positive
            elif avg_sent < -0.1:
                color = "#ef4444"  # Red for negative
            else:
                color = "#64748b"  # Gray for neutral
            
            net.add_node(
                f"cluster_{cluster_id}",
                label=f"Cluster {cluster_id}",
                title=f"Cluster {cluster_id}\n{size} sentences\nAvg sentiment: {avg_sent:.2f}",
                shape="hexagon",
                size=size * 2,
                color=color,
                borderWidth=2
            )
        
        # Add entity nodes and edges
        entity_totals = Counter()
        entity_types = {}
        
        for result in self.results:
            entity_totals[result['entity']] += result['mentions']
            entity_types[result['entity']] = result['entity_type']
        
        # Add entity nodes
        for entity, total in entity_totals.items():
            ent_type = entity_types[entity]
            
            # Color by entity type
            type_colors = {
                'PERSON': '#f87171',
                'ORG': '#60a5fa',
                'GPE': '#34d399'
            }
            color = type_colors.get(ent_type, '#94a3b8')
            
            net.add_node(
                f"entity_{entity}",
                label=entity,
                title=f"{entity} ({ent_type})\n{total} total mentions",
                shape="dot",
                size=min(total * 3, 50),
                color=color,
                borderWidth=2
            )
        
        # Add edges (entity to cluster)
        for result in self.results:
            # Only show edges where entity appears in >10% of cluster sentences
            appearance_rate = result['mentions'] / result['cluster_size']
            
            if appearance_rate > 0.1 and result['bias_score'] > 0.05:
                # Edge thickness based on bias
                thickness = result['bias_score'] * 10
                
                # Edge color based on sentiment with smoother gradients
                sentiment = result['sentiment']
                if abs(sentiment) < 0.05:  # Very neutral
                    edge_color = "#94a3b8"  # Gray
                elif sentiment > 0:  # Positive
                    if sentiment > 0.3:
                        edge_color = "#22c55e"  # Strong green
                    else:
                        edge_color = "#86efac"  # Light green
                else:  # Negative
                    if sentiment < -0.3:
                        edge_color = "#ef4444"  # Strong red
                    else:
                        edge_color = "#fca5a5"  # Light red
                
                title = (
                    f"{result['entity']} in Cluster {result['cluster']}\n"
                    f"Bias: {result['bias_score']:.2f}\n"
                    f"Sentiment: {result['sentiment']:.2f}\n"
                    f"{result['mentions']} mentions"
                )
                
                net.add_edge(
                    f"entity_{result['entity']}",
                    f"cluster_{result['cluster']}",
                    value=thickness,
                    title=title,
                    color=edge_color
                )
        
        # Save the graph
        net.save_graph(output_file)
        print(f"✅ Graph saved to {output_file}\n")
        
        return output_file
    
    def save_results(self, output_file: str = "results.csv"):
        """Save detailed results to CSV."""
        print(f"💾 Saving results to {output_file}...")
        
        detailed_results = []
        for idx, (sent, cluster_id) in enumerate(zip(self.sentences, self.clusters)):
            entities_str = ", ".join([e['text'] for e in sent['entities']])
            
            # Find bias scores for this sentence's entities in this cluster
            bias_scores = [
                r['bias_score'] for r in self.results
                if r['cluster'] == cluster_id and any(
                    e['text'] == r['entity'] for e in sent['entities']
                )
            ]
            avg_bias = np.mean(bias_scores) if bias_scores else 0
            
            # Get sentiment
            try:
                sent_result = self.sentiment_analyzer(sent['text'][:512])[0]
                sentiment_score = 0
                for item in sent_result:
                    if item['label'].lower() == 'positive':
                        sentiment_score = item['score']
                    elif item['label'].lower() == 'negative':
                        sentiment_score = -item['score']
            except:
                sentiment_score = 0
            
            detailed_results.append({
                'sentence': sent['text'],
                'article': sent['article_title'],
                'cluster': cluster_id,
                'entities': entities_str,
                'sentiment': sentiment_score,
                'bias_score': avg_bias
            })
        
        df = pd.DataFrame(detailed_results)
        df.to_csv(output_file, index=False)
        print(f"✅ Results saved!\n")
    
    def print_top_biases(self, n: int = 3):
        """Print top N most biased entity-cluster pairs."""
        print(f"🏆 Top {n} Most Biased Entity-Cluster Pairs:")
        print("=" * 80)
        
        for i, result in enumerate(self.results[:n], 1):
            print(f"\n{i}. {result['entity']} ({result['entity_type']}) in Cluster {result['cluster']}")
            print(f"   Bias Score: {result['bias_score']:.3f}")
            print(f"   Sentiment: {result['sentiment']:.3f}")
            print(f"   Mentions: {result['mentions']}")
            print(f"   Cluster Size: {result['cluster_size']} sentences")
        
        print("\n" + "=" * 80 + "\n")


def main():
    """Main execution function."""
    print("=" * 80)
    print(" BIAS ANALYSIS PIPELINE WITH INTERACTIVE KNOWLEDGE GRAPH")
    print("=" * 80 + "\n")
    
    # Initialize analyzer
    analyzer = BiasAnalyzer()
    
    # Determine input
    input_path = None
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
        print(f"📌 Using input: {input_path}\n")
    else:
        print("📌 No input provided - will download sample articles\n")
    
    try:
        # Run pipeline
        analyzer.load_data(input_path)
        analyzer.process_articles()
        analyzer.generate_embeddings()
        analyzer.cluster_sentences()
        analyzer.analyze_bias()
        
        # Generate outputs
        graph_file = analyzer.create_knowledge_graph()
        analyzer.save_results()
        analyzer.print_top_biases()
        
        # Open graph in browser
        try:
            webbrowser.open('file://' + os.path.abspath(graph_file))
            print("🌐 Graph opened in browser!")
        except:
            print(f"⚠️  Could not open browser automatically. Please open: {graph_file}")
        
        print("\n" + "=" * 80)
        print("✨ PIPELINE COMPLETE!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()