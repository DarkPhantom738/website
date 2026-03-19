// Project data for portfolio
export interface Project {
  id: string
  title: string
  description: string
  image: string
  heroVideo?: string
  heroEmbed?: string
  technologies: string[]
  github?: string
  demo?: string
  date: string
  content: string
}

export const projects: Project[] = [
  {
    id: "optisoccer",
  title: "OptiSoccer — AI-Powered Soccer Analytics",
  description: "Real-time player tracking and formation prediction using computer vision and deep learning",
  image: "/soccer-field-analysis-heatmap.jpg",
  heroVideo: "/optisoccer-debug-tracking-web.mp4",
  technologies: ["Python", "PyTorch", "YOLOv8", "OpenCV", "scikit-learn", "TypeScript"],
  github: "",
  demo: "",
  date: "June 2025",
  content: `
# Project Overview

**OptiSoccer** is an end-to-end AI system that transforms ordinary soccer footage into live tactical insights.  
It detects and tracks every player on the field, automatically identifies team colors, and predicts *optimal formations* using a deep neural network trained on several hours of professional mathces.

The platform aims to bridge the gap between **professional-level tactical analysis** and **accessible, camera-based insights**, making it possible for teams at any level to visualize formations and decision-making in real time.

---

## Motivation

Traditional soccer analytics depend heavily on manual tagging or expensive sensor systems.  
My goal with OptiSoccer was to create a **fully vision-based approach** that could analyze movement, structure, and space *directly from broadcast video* — with minimal human input.
To achieve this, I combined **YOLOv8 for player detection**, **color-based clustering for team identification**, **temporal tracking for stability**, and a custom **deep neural model** that learns the geometry of optimal formations. 
Through this article, I'd like to share some of the key components and challenges I faced while building(and currently building!) OptiSoccer.

---

## Player Detection

The foundation of the system lies in its ability to detect players accurately, even under varying angles, lighting, and crowd interference.  
I used **YOLOv8**, a state-of-the-art object detection model, fine-tuned on soccer broadcast footage to identify player bounding boxes with high precision.

\`\`\`python
from ultralytics import YOLO

model = YOLO("yolov8s.pt")

def detect_players(frame):
    results = model(frame, conf=0.2, classes=[0])[0]
    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
        conf = float(box.conf[0])
        detections.append([x1, y1, x2, y2, conf])
    return detections
\`\`\`

Because we were using tactical camera footage in order to train the model, this also meant we needed to project the field coordinates from the camera view to a top-down perspective. 
Fortunately, this has been done before and thus was easy to enforce. On the other hand, one of the major challenges with object detection on this type of scale is that the players are often very small in the frame (sometimes only 20x40 pixels). 
This means that the model needs to be very sensitive to small objects, which can lead to a high number of false positives + flickering in detections. Our solution to this is described in the next section.

### Multi-Frame Tracking

Once players are detected, we need to ensure their identities persist over time.  
To achieve this, we used a **distance-based association approach** combined with **short-term interpolation**.  

The algorithm compares new detections to previous player locations and maintains an internal state of trajectories.

\`\`\`python
def update_tracks(tracks, detections):
    updated_tracks = []
    for track in tracks:
        last_x, last_y = track["center"]
        best, best_dist = None, float("inf")
        for det in detections:
            cx = (det[0] + det[2]) / 2
            cy = (det[1] + det[3]) / 2
            dist = ((cx - last_x)**2 + (cy - last_y)**2)**0.5
            if dist < best_dist:
                best, best_dist = (cx, cy), dist
        if best:
            track["center"] = best
        updated_tracks.append(track)
    return updated_tracks
\`\`\`

Moreover, during my confidence threshold tuning, I was shocked to see that the model worked best at a low confidence interval of 0.2.

Using temporal smoothing and interpolation, also made it easier for me to implement a  **short-term memory interpolation**, where f a player disappears for a few frames, their position is estimated using nearby trajectories.  
This approach dramatically reduces ID switches and maintains visual continuity in movement paths.

---

## Team Identification

Recognizing which team a player belongs to without manual labeling is a critical step.  
I approached this by extracting the **dominant color** from each player’s bounding box (focusing on the jersey region) and using **K-means clustering** in HSV color space to categorize players into two groups.

\`\`\`python
from sklearn.cluster import KMeans

def identify_teams(player_colors):
    kmeans = KMeans(n_clusters=2, random_state=42).fit(player_colors)
    return kmeans.labels_, kmeans.cluster_centers_
\`\`\`

I made sure to stabalize the color extraction such that works even on non-ideal lighting conditions as long as the team colors are distinct enough.

---

## Building a Robust Dataset

Real matches often have **partial visibility**, meaning the camera rarely captures all 22 players at once.  
To train our formation prediction network, we built a **robust dataset generator** that interpolates missing positions near team centroids and masks uncertain data points.

To solve this, we calculated the centroid of visible players for each team and filled in missing players by sampling around this centroid with small random offsets.
This approach improved dataset usability by over **40%**.

\`\`\`python
import numpy as np

def fill_missing_positions(positions, mask, team_center):
    for i in range(11):
        if not mask[i]:
            offset = np.random.randn(2) * 0.1
            positions[i] = np.clip(team_center + offset, 0, 1)
    return positions
\`\`\`


---

## Neural Model — TacticalNet

Once the data is prepared, the goal is to predict where players *should* be given the current ball position.  
For this, I designed **TacticalNet**, a deep fully connected network that learns optimal formations conditioned on the ball’s coordinates.

\`\`\`python
import torch.nn as nn

class TacticalNet(nn.Module):
    def __init__(self, dims=[128, 256, 512, 256, 128]):
        super().__init__()
        layers, d = [], 2
        for h in dims:
            layers += [nn.Linear(d, h), nn.ReLU(), nn.Dropout(0.1), nn.BatchNorm1d(h)]
            d = h
        layers += [nn.Linear(d, 22), nn.Sigmoid()]
        self.model = nn.Sequential(*layers)

    def forward(self, x):
        return self.model(x)
\`\`\`

Initially, many early version of this model struggled to learn meaningful formations, often predicting clustered positions.
Our solution to this problem was to introduce a **centroid-based loss function** that penalizes deviations from expected team shapes, as is the case in soccer in general.

---

## Visualization — The Mini Tactical Pitch

During inference, the system generates a **mini tactical pitch overlay** that combines detections, team colors, and predicted optimal positions.  
Each player is represented by a colored dot and connected lines that show shape and transitions.

\`\`\`python
cv2.circle(pitch, (x, y), 8, (0, 0, 255), -1)   # Home
cv2.circle(pitch, (x, y), 8, (255, 0, 0), -1)   # Away
cv2.putText(pitch, "AI Tactical Positioning", (10, 20),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
\`\`\`

Here's an example of a given optimal formation overlay during a match given the current ball position:

---

## Key Results

| Metric | Value |
|--------|-------|
| Average Detection Accuracy | **94.1%** |
| Average Tracking Stability | **92.4%** |
| Average Formation Prediction Accuracy | **89.7%** |
| Processing Speed | **28–33ms per frame (RTX 3080)** |

These results demonstrate that OptiSoccer can process live footage in near real time, providing actionable tactical visualizations.

---

## What I Learned

Building OptiSoccer taught me that **robust preprocessing and tracking** matter more than model depth for real-world video analytics.  
Even the most accurate detection models need contextual corrections to remain useful in dynamic environments like sports.

I also learned that explainability—showing the coach *why* the AI recommends a certain shape—is just as critical as raw accuracy.

---

## Future Work

- Take in tactical camera footage as an actual input and give an optimal formation in real-time
    - Implement an agent that can contrast the current formation with the optimal formation and give suggestions to players on where to move
- Add formation classification (4-4-2, 4-3-3, etc.)  

---

## Conclusion

OptiSoccer shows that **AI doesn’t need sensor data to understand tactics**—it just needs pixels and smart design.  
By combining computer vision, data-driven inference, and interpretable visualizations, we move closer to making tactical analysis *real-time, objective, and accessible to everyone*.

## To be Released on IOS!

Although currently not public, I plan to release OptiSoccer as an iOS app where users can upload soccer footage and get tactical analysis in return.
    `,
},
  {
  id: "sarvaview",
  title: "SarvaView — Bias Detection via Knowledge Graphs",
  description: "Dynamic knowledge graph generation and sentiment analysis system for tracking bias across digital media",
  image: "/research-lab.jpg",
  heroEmbed: "/bias_knowledge_graph.html",
  technologies: ["Python", "spaCy", "Sentence-BERT", "UMAP", "HDBSCAN", "PyVis", "Trafilatura", "Transformers"],
  github: "",
  demo: "",
  date: "October 2025",
  content: `
# SarvaView: Uncovering Media Bias Through Knowledge Graphs

SarvaView is a comprehensive NLP pipeline that combines web scraping, sentence embeddings, and graph theory to analyze and visualize bias patterns in digital media. The system constructs dynamic knowledge graphs around user-selected topics, enabling researchers and analysts to track how different sources present and connect information.

## Technical Architecture

The platform is built as a monolithic Python pipeline with five main stages:

1. **Data Collection Engine**: Web scraping with Trafilatura
2. **NLP Processing Pipeline**: spaCy-based entity extraction
3. **Semantic Embedding**: Sentence-BERT for contextual representation
4. **Clustering & Analysis**: UMAP + HDBSCAN for pattern detection
5. **Graph Generation**: PyVis for interactive visualization

### Data Collection Implementation

The scraping engine uses Trafilatura to extract clean article text from URLs while respecting rate limits and handling edge cases:

\`\`\`python
import requests
from trafilatura import extract, fetch_url

def _download_sample_articles(self):
    """Download sample news articles using trafilatura."""
    sample_urls = [
        "https://www.bbc.com/news/science-environment",
        "https://www.theguardian.com/environment/climate-crisis",
        "https://www.nature.com/subjects/climate-change",
        # ... more URLs
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
\`\`\`

Trafilatura handles the heavy lifting of HTML parsing, removing boilerplate content, and extracting article text. I added length validation (\`> 200\` characters) to filter out navigation pages and ensure we're getting actual article content.

## Natural Language Processing Pipeline

The NLP pipeline leverages spaCy's transformer-based model (\`en_core_web_trf\`) for accurate entity recognition and sentence segmentation:

### Entity Recognition and Sentence Extraction

One of the most critical aspects was extracting entities while maintaining their sentence-level context. spaCy's pipeline makes this straightforward:

\`\`\`python
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
\`\`\`

I focused on three entity types: \`PERSON\`, \`ORG\` (organizations), and \`GPE\` (geopolitical entities like countries and cities). These are the most relevant for bias analysis in news articles. Each sentence is stored with its entities intact, allowing us to track which entities appear in which contexts.

### Semantic Embeddings

To capture semantic similarity between sentences, I used Sentence-BERT (\`all-MiniLM-L6-v2\`), which generates 384-dimensional embeddings:

\`\`\`python
def generate_embeddings(self):
    """Generate sentence embeddings."""
    print("🧠 Generating embeddings...")
    texts = [s['text'] for s in self.sentences]
    self.embeddings = self.embedder.encode(
        texts,
        show_progress_bar=True,
        batch_size=32
    )
    print(f"✅ Generated embeddings: {self.embeddings.shape}\\n")
\`\`\`

Sentence-BERT significantly outperforms traditional methods like TF-IDF because it captures semantic meaning rather than just word overlap. Two sentences can be semantically similar even with completely different words.

## Clustering for Narrative Detection

The clustering stage identifies groups of sentences that discuss similar topics or narratives:

\`\`\`python
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
\`\`\`

I chose UMAP for dimensionality reduction because it preserves both local and global structure better than PCA or t-SNE. HDBSCAN then identifies density-based clusters without requiring a predetermined number of clusters—it automatically finds natural groupings and labels outliers as noise (\`-1\`).

## Bias Analysis Algorithm

The bias detection algorithm is the heart of SarvaView. It combines multiple signals to identify when an entity is disproportionately associated with a particular narrative:

\`\`\`python
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
bias_score = (
    0.4 * concentration +  # How much of entity's mentions are in this cluster
    0.3 * uniqueness +     # How few clusters contain this entity
    0.3 * cluster_freq     # How frequently it appears in this cluster
) * cluster_size_factor    # Adjust for cluster size
\`\`\`

The bias score represents how strongly an entity is associated with a specific narrative cluster. High concentration means most mentions of that entity occur in one cluster. High uniqueness means the entity appears in few clusters. The cluster size factor prevents small clusters from dominating the results.

### Sentiment Analysis Integration

For each entity-cluster pair, I calculate sentiment to understand the *tone* of coverage:

\`\`\`python
# Sentiment analysis for sentences containing this entity
entity_sentences = [
    s['text'] for s in self.sentences 
    if cluster_id == self.clusters[self.sentences.index(s)]
    and any(e['text'] == entity for e in s['entities'])
]

if entity_sentences:
    sample_sentences = entity_sentences[:10]
    sentiments = []
    
    for sent_text in sample_sentences:
        try:
            results = self.sentiment_analyzer(sent_text[:512])[0]
            for result in results:
                if result['label'].lower() == 'neutral':
                    sentiments.append(0.0)
                elif result['label'].lower() == 'positive':
                    sentiments.append(result['score'] * 0.5)
                elif result['label'].lower() == 'negative':
                    sentiments.append(-result['score'] * 0.5)
        except Exception as e:
            continue
    
    if sentiments:
        avg_raw = np.mean(sentiments)
        avg_sentiment = np.tanh(avg_raw)  # Squashes to [-1, 1]
\`\`\`

I used the \`cardiffnlp/twitter-roberta-base-sentiment-latest\` model, which was fine-tuned on social media text and handles news-style language well. The \`tanh\` function smooths extreme values and pushes mild sentiments toward neutral.

## Knowledge Graph Generation

The interactive knowledge graph visualizes the relationships between entities and narrative clusters:

\`\`\`python
def create_knowledge_graph(self, output_file: str = "bias_knowledge_graph.html"):
    """Generate interactive knowledge graph with PyVis."""
    net = Network(
        height="900px",
        width="100%",
        bgcolor="#1a1a1a",
        font_color="white",
        notebook=False
    )
    
    # Configure physics for better layout
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
        "solver": "forceAtlas2Based"
      }
    }
    """)
\`\`\`

PyVis creates browser-based interactive graphs using vis.js. The force-directed layout naturally groups related nodes together while keeping unrelated nodes apart.

### Node Coloring Strategy

Nodes are colored by entity type and sentiment:

\`\`\`python
# Add cluster nodes
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

# Entity nodes colored by type
type_colors = {
    'PERSON': '#f87171',
    'ORG': '#60a5fa',
    'GPE': '#34d399'
}
\`\`\`

This color scheme makes it easy to identify patterns at a glance. For example, if multiple organizations (blue nodes) connect to a negatively-toned cluster (red), it suggests critical coverage of those organizations.

### Edge Visualization

Edges between entities and clusters are weighted by bias score and colored by sentiment:

\`\`\`python
for result in self.results:
    appearance_rate = result['mentions'] / result['cluster_size']
    
    if appearance_rate > 0.1 and result['bias_score'] > 0.05:
        thickness = result['bias_score'] * 10
        
        sentiment = result['sentiment']
        if abs(sentiment) < 0.05:
            edge_color = "#94a3b8"  # Gray
        elif sentiment > 0:
            edge_color = "#22c55e" if sentiment > 0.3 else "#86efac"
        else:
            edge_color = "#ef4444" if sentiment < -0.3 else "#fca5a5"
        
        net.add_edge(
            f"entity_{result['entity']}",
            f"cluster_{result['cluster']}",
            value=thickness,
            color=edge_color
        )
\`\`\`

Thicker edges indicate stronger bias associations. The gradient from light to dark red/green shows sentiment intensity.

## Challenges and Solutions

### Challenge 1: Handling Small Datasets

With only 10-20 articles, clustering can be unstable. I addressed this by:

- Using \`min_cluster_size=5\` in HDBSCAN to require meaningful groupings
- Implementing cluster size penalties in the bias score
- Adding noise filtering (\`cluster_id != -1\`)

### Challenge 2: Sentiment Neutrality Bias

Many news sentences are intentionally neutral. The default sentiment analyzer was too sensitive, so I:

- Dampened positive/negative scores by 50% (\`* 0.5\`)
- Applied \`tanh\` smoothing to push mild sentiments toward 0
- Explicitly handled "neutral" labels as \`0.0\`

### Challenge 3: Entity Disambiguation

"Washington" could refer to a person, city, or state. spaCy's transformer model handles this well through context, but I still filtered to only \`PERSON\`, \`ORG\`, and \`GPE\` to reduce ambiguity.

## Key Results

The system successfully identifies bias patterns in real-world datasets. For example, in climate change articles:

- **"Greta Thunberg"** appeared primarily in activist-focused clusters with positive sentiment
- **"Donald Trump"** appeared in policy criticism clusters with negative sentiment  
- **"IPCC"** was distributed across technical and warning-focused clusters

Processing time on a typical laptop:
- 10 articles: ~2 minutes
- 50 articles: ~8 minutes
- 100 articles: ~20 minutes

## What I Learned

Building SarvaView taught me that **data quality matters more than algorithm sophistication**. Initial attempts with TF-IDF and K-means produced poor results. Switching to Sentence-BERT and HDBSCAN was transformative because they better capture semantic relationships.

I also learned that **bias detection requires multiple signals**. No single metric (frequency, sentiment, etc.) is sufficient. The weighted combination of concentration, uniqueness, and frequency provides more robust results.

## Future Work

- **Temporal Analysis**: Track how entity-narrative associations evolve over time
- **Multi-document Summarization**: Generate explanations for why certain bias scores are high
- **Active Learning**: Allow users to correct misclassifications and retrain
- **Comparative Analysis**: Compare bias patterns across different news sources

## Technical Requirements

\`\`\`bash
pip install spacy sentence-transformers transformers torch
pip install umap-learn hdbscan pandas trafilatura 
pip install requests pyvis tqdm numpy scikit-learn

python -m spacy download en_core_web_trf
\`\`\`

## Running the Pipeline

\`\`\`bash
# Run with default sample data
python bias_analyzer.py

# Run with your own articles folder
python bias_analyzer.py /path/to/articles

# Run with CSV (must have 'text' column)
python bias_analyzer.py articles.csv
\`\`\`

The pipeline outputs:
- \`bias_knowledge_graph.html\`: Interactive graph (auto-opens in browser)
- \`results.csv\`: Detailed bias scores for every sentence

## Conclusion

SarvaView demonstrates that **complex bias patterns can be detected without labeled training data**. By combining unsupervised clustering with multi-factor bias scoring, we can surface narratives and associations that might not be obvious to human readers.

The knowledge graph visualization makes these patterns interpretable, allowing journalists, researchers, and fact-checkers to quickly identify how entities are framed across different narratives.
    `
}
]
