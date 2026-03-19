// Mini Project data for portfolio
export interface MiniProject {
  id: string
  title: string
  description: string
    image?: string
  date: string
  technologies: string[]
  github?: string
  demo?: string
  content: string
}

export const miniProjects: MiniProject[] = [
  {
    id: "stock-investments",
    title: "Stock Market Analysis Tool",
    description: "A sophisticated stock analysis tool that identifies market opportunities by analyzing price movements, news patterns, and earnings history using the Alpha Vantage API.",
    image: "/project-demo.jpg",
    date: "October 2023",
    technologies: ["Python", "Streamlit", "Pandas", "Alpha Vantage API", "Requests"],
    github: "https://github.com/DarkPhantom738/stock-analyzer",
    demo: "",
    content: `
# My Journey Building a Stock Market Analysis Tool

My journey into algorithmic trading began with a challenge in my **DECA Stock Market Game** competition. I found myself spending countless hours manually searching for stock opportunities, particularly focusing on two patterns that consistently yielded results: **stocks with unexplained price jumps (no news coverage)** and **companies with strong earnings beat histories**.

---

## The Initial Spark

After successfully turning **$100k into $150k in just two months** during the DECA competition using these strategies, I realized that this manual process could be automated. I discovered the **Alpha Vantage API** and saw an opportunity to build a tool that could systematically identify these patterns.

It all started when I found myself spending hours each weekend scrolling through financial news and stock charts, trying to identify potential investments. I thought to myself:  
> *"There has to be a better way to do this."*

That’s when I discovered the **Alpha Vantage API** and realized I could automate much of this research process. The philosophy I followed was simple yet effective:  
- **Short overvalued stocks** that spike with *no news*  
- **Invest in companies** predicted to beat earnings  

You’d be surprised how effective this strategy is — it made **$150k from a $100k initial investment in 2 months** in the online stock market game.

This became the perfect **passion project** to deepen my understanding of API integration, data pipelines, and real-time financial analysis.

---

## Technical Deep Dive

### 1. Fetching Top Gainers in Real Time

The foundation is pulling **top intraday gainers** using Alpha Vantage's \`TOP_GAINERS_LOSERS\` endpoint:

\`\`\`python
def fetch_top_gainers():
    params = {
        'function': 'TOP_GAINERS_LOSERS',
        'apikey': API_KEY
    }
    response = requests.get(BASE_URL, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    gainers = data['top_gainers']
    df = pd.DataFrame(gainers)[['ticker', 'price', 'change_percentage']].copy()
    df.columns = ['Symbol', 'Price', 'Change %']
    df['Change %'] = df['Change %'].str.rstrip('%').astype(float)
    df['Price'] = df['Price'].astype(float).round(2)

    # Filter: Price ≥ $3, Gain ≥ 50%
    return df[(df['Price'] >= 3.0) & (df['Change %'] >= 50.0)].sort_values('Change %', ascending=False).head(20)
\`\`\`

This gives us **high-momentum candidates** — but most are driven by news. We want the *silent movers*.

---

### 2. Eliminating News-Driven Spikes

Using the \`NEWS_SENTIMENT\` endpoint, we check if **any article** was published on the spike day:

\`\`\`python
def has_news_on_date(symbol, date_str):
    target_date = datetime.strptime(date_str, "%Y-%m-%d")
    time_from = target_date.strftime("%Y%m%dT0000")
    time_to = target_date.strftime("%Y%m%dT2359")
    
    params = {
        'function': 'NEWS_SENTIMENT',
        'tickers': symbol,
        'time_from': time_from,
        'time_to': time_to,
        'limit': 50,
        'apikey': API_KEY
    }
    
    response = requests.get(BASE_URL, params=params, timeout=10)
    data = response.json()
    
    return 'feed' in data and len(data['feed']) > 0
\`\`\`

We then **filter the top 10 gainers**, respecting the **5 calls/minute** free tier limit:

\`\`\`python
for position, (idx, row) in enumerate(gainers_df_limited.iterrows()):
    symbol = row['Symbol']
    has_news = has_news_on_date(symbol, date_str)
    
    if not has_news:
        filtered_symbols.append(symbol)
    
    progress_bar.progress((position + 1) / total)
    if position < total - 1:
        time.sleep(12)  # Stay under rate limit
\`\`\`

> **Result**: Only *unexplained pumps* remain — ideal shorting opportunities.

---

### 3. Earnings Beat Prediction Engine

For the long side, we pull **tomorrow’s earnings calendar**:

\`\`\`python
def fetch_earnings_calendar(date_str):
    params = {
        'function': 'EARNINGS_CALENDAR',
        'horizon': '3month',
        'apikey': API_KEY
    }
    response = requests.get(BASE_URL, params=params)
    df = pd.read_csv(StringIO(response.text))
    df['reportDate'] = pd.to_datetime(df['reportDate']).dt.date
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    return df[df['reportDate'] == target_date]
\`\`\`

Then, we analyze **last 4 quarters** using the \`EARNINGS\` endpoint:

\`\`\`python
def get_earnings_history(symbol):
    params = {'function': 'EARNINGS', 'symbol': symbol, 'apikey': API_KEY}
    data = requests.get(BASE_URL, params=params).json()
    
    quarterly = data.get('quarterlyEarnings', [])
    if len(quarterly) < 4:
        return None
    
    beats = 0
    for i in range(4):
        reported = quarterly[i].get('reportedEPS')
        estimated = quarterly[i].get('estimatedEPS')
        if reported and estimated:
            try:
                if float(reported) > float(estimated):
                    beats += 1
            except:
                continue
    return beats >= 3
\`\`\`

Only stocks with **3+ beats in 4 quarters** are recommended.

---

## Lessons Learned

### Working with Financial APIs

1. **Rate Limiting is Critical**  
   Free tier: 5 calls/minute. I used \`time.sleep(12)\` and progress bars to prevent bans.

2. **Data Quality Matters**  
   Handled CSV parsing, missing fields, and weekend trading days:

   \`\`\`python
   def get_last_trading_day(date):
       while date.weekday() >= 5:
           date -= timedelta(days=1)
       return date
   \`\`\`

3. **Error Handling is Key**  
   Comprehensive try/except blocks and user-friendly messages:

   \`\`\`python
   except requests.exceptions.RequestException as e:
       st.error(f"Error fetching data: {e}")
   \`\`\`

---

### Building the UI with Streamlit

I chose **Streamlit** for its speed and elegance:

\`\`\`python
st.set_page_config(page_title="Stock Analyzer", layout="wide")

st.title("Stock Market Analyzer")
st.markdown("---")

col1, col2 = st.columns(2)
with col1:
    min_price = st.slider("Minimum Stock Price", 0, 100, 3)
with col2:
    gain_threshold = st.slider("Minimum Gain (%)", 0, 100, 50)
\`\`\`

Real-time feedback with spinners and expanders:

\`\`\`python
with st.spinner("Fetching top gainers..."):
    gainers_df = fetch_top_gainers()

with st.expander("View All Top Gainers (Before Filtering)", expanded=False):
    st.dataframe(gainers_df, use_container_width=True)
\`\`\`

---

## Current Status and Future Plans

### Current Features
- Real-time gainer detection with 50%+ filter
- News absence verification
- Earnings calendar + beat history analysis
- Interactive Streamlit dashboard
- Rate limit safety system

### What’s Next?
1. **Backtesting Module** – Simulate strategy over 5 years
2. **Email/SMS Alerts** – Instant signal delivery
3. **Machine Learning Layer** – Predict "no-news pump" likelihood
4. **NLP Sentiment Analysis** – Classify subtle news tone

---

## Technical Challenges and Solutions

| Challenge | Solution |
|--------|----------|
| API rate limits | \`time.sleep(12)\` + progress UI |
| CSV response parsing | \`StringIO\` + \`pd.read_csv\` |
| Weekend date handling | \`get_last_trading_day()\` |
| Data anomalies | Try/except + logging |

---

## Conclusion

Building this tool has been an **incredible learning experience**. It’s taught me about:

- **Financial markets** and behavioral inefficiencies  
- **API integration** under real-world constraints  
- **Data processing** with Pandas and rate-limited sources  
- **UI/UX design** that makes complex data actionable  

Most importantly, it’s shown me how **programming can solve real-world problems** and **automate expert-level analysis**.

This project started as a weekend hack to save time — it’s now a **live financial intelligence engine** that I use daily.

Update October 2025: Some of my DECA friends have been asking for the code so I made it public on GitHub!
**Feel free to check out the code on GitHub and try the live demo!**

`
},
{
    id: "portfolio",
    title: "Personal Portfolio Website",
    description: "A modern, responsive portfolio website built with Next.js and TypeScript",
    image: "/coding-setup.png",
    date: "March 2024",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Shadcn/ui", "Markdown"],
    github: "",
    demo: "",
    content: `
# Project Overview

This **Personal Portfolio Website** showcases my projects, papers, and achievements using modern web technologies and best practices.  
Built with a focus on performance, accessibility, and user experience, the site demonstrates my commitment to clean, maintainable code.

---

## Key Features

The portfolio implements several modern web development features:

- **Responsive Design**: Optimized for all devices and screen sizes
- **Dynamic Routing**: Efficient page navigation and content loading
- **Dark Mode**: Customizable theme support for better readability
- **Markdown Content**: Flexible content management system
- **Component Library**: Reusable UI components with Shadcn/ui
- **TypeScript**: Enhanced type safety and development experience

---

## Technical Implementation

The website is built using a modern tech stack:

- **Next.js** for server-side rendering and routing
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** for utility-first styling
- **Shadcn/ui** for consistent UI components
- **Markdown** for flexible content management

The architecture follows best practices for web development:

\`\`\`typescript
// Example of the project type definition
interface Project {
  id: string
  title: string
  description: string
  technologies: string[]
  content: string
}
\`\`\`

---

## Design Philosophy

The site embodies several key principles:

- **Clean Typography**: Emphasis on readability and hierarchy
- **Minimal Design**: Focus on content and functionality
- **Performance First**: Optimized loading and rendering
- **Accessibility**: WCAG compliance and keyboard navigation
- **Maintainable Code**: Component-based architecture

The result is a portfolio that effectively presents my work while demonstrating technical expertise.
`
  },


  {
  id: "soundscape",
  title: "Text-to-Soundscape Composer",
  description: "AI-powered soundscape generation system that transforms text descriptions into immersive, layered audio environments",
  image: "/soundscape-composer-ui.png",
  technologies: ["Python", "PyTorch", "Gradio", "AudioLDM-2", "MusicGen", "Qwen2", "Pedalboard", "Librosa"],
  github: "",
  demo: "",
  date: "December 2024",
  content: `
# Text-to-Soundscape Composer: Building Immersive Audio from Text

Text-to-Soundscape Composer is an AI-powered audio generation system that transforms natural language descriptions into rich, multi-layered soundscapes. Unlike simple text-to-audio models that generate monolithic audio clips, this system creates spatially-positioned, temporally-arranged sound environments with discrete events, ambient layers, and professional audio effects.

![Text-to-Soundscape Composer interface](/soundscape-composer-ui.png)

## Technical Architecture

The system combines three core AI models in a multi-stage pipeline:

1. **LLM Scene Analyzer**: Qwen2-1.5B breaks down text into structured soundscape specifications
2. **Audio Generation Layer**: AudioLDM-2 or MusicGen creates individual sound components
3. **Spatial Audio Processor**: Pedalboard applies effects, panning, and mixing

### Why Multiple Models?

Early experiments with single-model approaches (just AudioLDM or MusicGen alone) produced flat, monotonous audio. The breakthrough came from treating soundscape generation as a **composition problem** rather than a generation problem—separating scene understanding, sound synthesis, and spatial arrangement into distinct stages.

## Stage 1: LLM-Powered Scene Analysis

The first challenge was converting free-form text like "rainy forest chase at dusk with thunder" into something an audio model could work with. I used Qwen2-1.5B-Instruct to decompose scenes into structured JSON specifications:

\`\`\`python
def refine_prompt(scene_description: str, mood: float) -> Dict:
    """Use LLM to break down scene into structured soundscape components"""
    tokenizer, model = MODEL_CACHE['llm']
    
    mood_desc = "calm and peaceful" if mood < 0.3 else "moderately intense" if mood < 0.7 else "dramatic and epic"
    
    system_prompt = """You are a sound designer AI. Given a scene description, output a JSON structure with:
{
  "ambience": "brief description of background sound (rain, wind, ocean, forest, city, etc.)",
  "events": [
    {"sound": "sound name", "timing": time_in_seconds, "pan": -1_to_1, "volume": 0_to_1},
    ...
  ],
  "mood": "atmospheric descriptor"
}
Timing should be spread across 0-40 seconds. Pan: -1=left, 0=center, 1=right.
Output ONLY valid JSON, no other text."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    if 'attention_mask' not in inputs:
        inputs['attention_mask'] = torch.ones_like(inputs['input_ids'])
    
    with torch.no_grad():
        outputs = model.generate(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['attention_mask'],
            max_new_tokens=512,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
\`\`\`

The LLM outputs structured specifications like:

\`\`\`json
{
  "ambience": "heavy rain with distant thunder",
  "events": [
    {"sound": "footstep", "timing": 5, "pan": 0, "volume": 0.6},
    {"sound": "thunder crash", "timing": 12, "pan": 0.8, "volume": 0.9},
    {"sound": "branch snap", "timing": 18, "pan": -0.5, "volume": 0.5}
  ],
  "mood": "tense and atmospheric"
}
\`\`\`

This structured approach gives us precise control over timing and spatial positioning—something impossible with end-to-end text-to-audio models.

### JSON Extraction and Error Handling

LLMs sometimes include extra text around JSON, so I implemented robust extraction:

\`\`\`python
try:
    start = response.find('{')
    end = response.rfind('}') + 1
    if start != -1 and end > start:
        json_str = response[start:end]
        result = json.loads(json_str)
    else:
        raise ValueError("No JSON found")
except:
    # Fallback structure
    result = {
        "ambience": scene_description.split()[0] if scene_description else "ambient",
        "events": [
            {"sound": "footstep", "timing": 5, "pan": 0, "volume": 0.6},
            {"sound": "bird", "timing": 15, "pan": 0.5, "volume": 0.4},
            {"sound": "rustle", "timing": 25, "pan": -0.3, "volume": 0.5},
        ],
        "mood": mood_desc
    }
\`\`\`

This ensures the pipeline never crashes due to malformed LLM outputs.

## Stage 2: Audio Generation with Model Fallbacks

The audio generation layer supports multiple models with automatic fallback. AudioLDM-2 is preferred for quality, but MusicGen serves as a robust alternative:

\`\`\`python
def load_models():
    """Load all required models with caching"""
    global MODEL_CACHE
    
    if 'audio_gen' not in MODEL_CACHE:
        try:
            from diffusers import AudioLDM2Pipeline
            
            pipe = AudioLDM2Pipeline.from_pretrained(
                "cvssp/audioldm-s-full-v2",
                torch_dtype=torch.float16
            )
            pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
            
            MODEL_CACHE['audio_gen'] = pipe
            MODEL_CACHE['audio_gen_type'] = 'audioldm2'
            print("✓✓✓ AudioLDM-2 LOADED SUCCESSFULLY! ✓✓✓")
            
        except Exception as e:
            print(f"AudioLDM-2 failed, falling back to MusicGen...")
            
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
            model = MusicgenForConditionalGeneration.from_pretrained(
                "facebook/musicgen-small",
                torch_dtype=torch.float16
            ).to("cuda" if torch.cuda.is_available() else "cpu")
            
            MODEL_CACHE['audio_gen'] = (processor, model)
            MODEL_CACHE['audio_gen_type'] = 'musicgen'
            print("✓ MusicGen loaded as fallback")
\`\`\`

This fallback mechanism ensures the system works even when specific models aren't available.

### Generating Ambient Base Layers

Ambient sounds form the continuous background. AudioLDM-2 generates 10-second clips that we loop seamlessly:

\`\`\`python
def generate_ambience(description: str, duration: int = 45) -> Tuple[np.ndarray, int]:
    """Generate ambient base layer using AudioLDM-2 or MusicGen"""
    
    if MODEL_CACHE.get('audio_gen_type') == 'audioldm2':
        pipe = MODEL_CACHE['audio_gen']
        prompt = f"ambient {description} soundscape, atmospheric, continuous, high quality"
        
        # AudioLDM-2 generates up to 10 seconds
        audio = pipe(
            prompt,
            num_inference_steps=200,  # Higher steps for better quality
            audio_length_in_s=10.0,
        ).audios[0]
        
        sample_rate = 16000
        
        # Loop to reach desired duration
        target_samples = int(duration * sample_rate)
        if len(audio) > 0:
            num_loops = (target_samples // len(audio)) + 1
            audio = np.tile(audio, num_loops)[:target_samples]
\`\`\`

The key insight here: **short, high-quality loops sound better than long, lower-quality generations**. I initially tried generating the full 45 seconds directly, but the model's quality degraded significantly over time.

### Generating Discrete Sound Effects

Sound effects use shorter generation times for crisp, clear sounds:

\`\`\`python
def generate_sfx(sound_name: str, duration: float = 2.0) -> Tuple[np.ndarray, int]:
    """Generate or retrieve sound effect"""
    
    if MODEL_CACHE.get('audio_gen_type') == 'audioldm2':
        pipe = MODEL_CACHE['audio_gen']
        prompt = f"{sound_name} sound effect"
        
        audio = pipe(
            prompt,
            num_inference_steps=100,
            audio_length_in_s=min(duration, 10.0),
        ).audios[0]
        
        sr = 16000
        audio = np.array(audio).flatten()
        
        # Trim or pad to exact duration
        target_len = int(duration * sr)
        if len(audio) > target_len:
            audio = audio[:target_len]
        else:
            audio = np.pad(audio, (0, max(0, target_len - len(audio))))
        
        return audio, sr
\`\`\`

I cap SFX duration at 2 seconds because longer sounds become repetitive and lose impact.

## Stage 3: Spatial Audio Processing

The most distinctive feature of this system is spatial audio. Each sound is positioned in stereo space using equal-power panning:

\`\`\`python
def apply_effects(audio: np.ndarray, sr: int, pan: float, volume: float, add_reverb: bool = True) -> np.ndarray:
    """Apply spatial effects using pedalboard"""
    audio = np.array(audio).flatten()
    
    # Convert to stereo
    audio_stereo = np.stack([audio, audio])
    
    try:
        board = Pedalboard()
        
        if add_reverb:
            board.append(Reverb(room_size=0.3, damping=0.5, wet_level=0.15))
        
        gain_db = 20 * np.log10(max(volume, 1e-7))
        gain_db = np.clip(gain_db, -60, 20)
        board.append(Gain(gain_db=float(gain_db)))

        audio_processed = board(audio_stereo, sr)
    except Exception as e:
        print(f"Effect processing warning: {e}, using dry signal")
        audio_processed = audio_stereo

    # Equal-power panning
    pan = np.clip(pan, -1.0, 1.0)
    angle = (pan + 1.0) * (np.pi / 4.0)
    left_gain = np.cos(angle)
    right_gain = np.sin(angle)

    audio_processed[0, :] *= left_gain
    audio_processed[1, :] *= right_gain
    
    return audio_processed
\`\`\`

**Equal-power panning** is crucial here. Simple linear panning (where \`left = 1 - pan\` and \`right = pan\`) creates a perceived volume drop in the center. The trigonometric approach maintains constant perceived loudness across the stereo field.

### The Mixing Stage

Finally, all layers are combined on a stereo canvas:

\`\`\`python
def mix_soundscape(ambience: np.ndarray, events: List[Dict], sr: int, duration: int, loopable: bool) -> np.ndarray:
    """Mix all audio elements into final soundscape"""
    total_samples = int(duration * sr)
    canvas = np.zeros((2, total_samples))
    
    # Add ambience (looped across full duration)
    amb_stereo = np.stack([ambience, ambience])
    amb_samples = amb_stereo.shape[1]
    
    for i in range(0, total_samples, amb_samples):
        end = min(i + amb_samples, total_samples)
        chunk_len = end - i
        canvas[:, i:end] = amb_stereo[:, :chunk_len] * 0.5
    
    # Add events at specific times
    for event in events:
        timing = float(event.get('timing', 0))
        if timing >= duration - 2:
            continue
        
        sfx, sfx_sr = generate_sfx(event['sound'], duration=2.0)
        
        if sfx_sr != sr:
            sfx = librosa.resample(sfx, orig_sr=sfx_sr, target_sr=sr)
        
        sfx_processed = apply_effects(
            sfx, sr,
            pan=float(event.get('pan', 0)),
            volume=float(event.get('volume', 0.6)),
            add_reverb=True
        )
        
        start_sample = int(timing * sr)
        start_sample = max(0, min(start_sample, total_samples - 1))
        
        sfx_len = sfx_processed.shape[1]
        end_sample = min(start_sample + sfx_len, total_samples)
        length = end_sample - start_sample
        
        if length > 0:
            canvas[:, start_sample:end_sample] += sfx_processed[:, :length] * 0.8
\`\`\`

The ambience is mixed at 50% volume, while events are at 80%. This balances background atmosphere with foreground action.

### Crossfade for Seamless Loops

For loopable soundscapes (useful for game audio or ambient music), I apply fade-in and fade-out:

\`\`\`python
if loopable:
    fade_samples = int(0.5 * sr)
    fade_samples = min(fade_samples, total_samples // 4)
    
    if fade_samples > 0:
        fade_in = np.linspace(0, 1, fade_samples)
        fade_out = np.linspace(1, 0, fade_samples)
        
        canvas[:, :fade_samples] *= fade_in
        canvas[:, -fade_samples:] *= fade_out
\`\`\`

This creates smooth transitions when the audio loops back to the beginning.

## Challenges and Solutions

### Challenge 1: Model Loading Times

Loading multiple large models (Qwen2 + AudioLDM-2 + Pedalboard) takes 2-3 minutes on first run. I implemented a global model cache:

\`\`\`python
MODEL_CACHE = {}

def load_models():
    global MODEL_CACHE
    
    if 'llm' not in MODEL_CACHE:
        # Load LLM only once
        tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-1.5B-Instruct")
        model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2-1.5B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto"
        )
        MODEL_CACHE['llm'] = (tokenizer, model)
\`\`\`

After the first generation, subsequent requests complete in 10-15 seconds.

### Challenge 2: Audio Normalization

Early versions had severe clipping issues. Some generated sounds peaked at 10x the expected amplitude. The solution was safe normalization with epsilon protection:

\`\`\`python
max_val = np.abs(canvas).max()
if max_val > 1e-7:
    canvas = canvas / max_val * 0.9
\`\`\`

The \`1e-7\` threshold prevents division by zero on silent audio.

### Challenge 3: Sample Rate Mismatches

AudioLDM-2 outputs at 16kHz, MusicGen at 32kHz, and Pedalboard expects 44.1kHz. I added automatic resampling:

\`\`\`python
if sfx_sr != sr:
    sfx = librosa.resample(sfx, orig_sr=sfx_sr, target_sr=sr)
\`\`\`

This ensures all audio aligns perfectly on the mixing canvas.

## Results and Performance

The system generates 45-second soundscapes in approximately:
- **AudioLDM-2**: 15-20 seconds on RTX 3080
- **MusicGen**: 25-30 seconds on RTX 3080
- **CPU-only**: 2-3 minutes (not recommended)

Quality comparison:
- **AudioLDM-2**: Superior quality, realistic textures, best for ambience
- **MusicGen**: More musical, better for tonal sounds, faster generation
- **Hybrid approach** (AudioLDM ambience + MusicGen SFX) often produces best results

## What I Learned

The biggest lesson: **decomposition beats end-to-end**. Trying to generate complete soundscapes in one shot produced muddy, incoherent audio. Breaking the problem into scene analysis → component generation → spatial mixing unlocked professional-quality results.

I also learned that **prompt engineering for audio models differs radically from text**. Adding words like "high quality" or "professional" to audio prompts significantly improves output, whereas they're often redundant for image models.

## Future Work

- **Real-time streaming**: Currently generates entire soundscape before playback
- **Interactive editing**: Allow users to adjust individual event timing/panning after generation
- **Custom sound libraries**: Import user-provided SFX to expand beyond generated sounds
- **3D audio**: Extend to 5.1 or Dolby Atmos using HRTF processing
- **Video integration**: Sync soundscapes to video footage for automated sound design

## Technical Requirements

\`\`\`bash
pip install torch torchaudio transformers diffusers
pip install gradio librosa soundfile pedalboard
pip install datasets numpy

# For AudioLDM-2 support (optional)
pip install --upgrade diffusers
\`\`\`

Hardware recommendations:
- **GPU**: 8GB+ VRAM (RTX 3070 or better)
- **RAM**: 16GB+ system memory
- **Storage**: 10GB for model weights

## Running the System

\`\`\`bash
python app.py
\`\`\`

Then navigate to \`http://localhost:7860\` in your browser.

Example prompts to try:
- "rainy forest chase at dusk with thunder"
- "busy medieval marketplace with horses and crowd chatter"
- "sci-fi spaceship interior with alarms and computer beeps"
- "peaceful beach at sunset with gentle waves and seagulls"

## Conclusion

Text-to-Soundscape Composer demonstrates that **AI audio generation becomes dramatically more useful when combined with spatial audio processing and structured generation**. Rather than treating audio as a black-box output, decomposing soundscapes into discrete, positioned elements creates controllable, professional-quality results.

The system proves that open-source models (Qwen2, AudioLDM-2, MusicGen) can compete with proprietary solutions when thoughtfully combined. By leveraging each model's strengths and adding sophisticated post-processing, we achieve results that would be impossible with any single model alone.
    `
}

]
