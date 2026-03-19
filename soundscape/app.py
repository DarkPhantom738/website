import gradio as gr
import torch
import torchaudio
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from diffusers import StableAudioPipeline
import librosa
import soundfile as sf
from pedalboard import Pedalboard, Reverb, Gain
from pedalboard.io import AudioFile
import json
import os
from datasets import load_dataset
import random
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

# Global model cache
MODEL_CACHE = {}

def load_models():
    """Load all required models with caching"""
    global MODEL_CACHE
    
    if 'llm' not in MODEL_CACHE:
        print("Loading LLM for prompt refinement...")
        tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-1.5B-Instruct")
        model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2-1.5B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto"
        )
        MODEL_CACHE['llm'] = (tokenizer, model)
    
    if 'audio_gen' not in MODEL_CACHE:
        print("\n" + "="*60)
        print("LOADING AUDIO GENERATION MODEL")
        print("="*60)
        
        # Try AudioLDM-2 first
        try:
            from diffusers import AudioLDM2Pipeline
            print("✓ AudioLDM2Pipeline import successful")
            print("→ Loading cvssp/audioldm-s-full-v2...")
            
            pipe = AudioLDM2Pipeline.from_pretrained(
                "cvssp/audioldm-s-full-v2",
                torch_dtype=torch.float16
            )
            print("→ Moving model to device...")
            pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
            
            MODEL_CACHE['audio_gen'] = pipe
            MODEL_CACHE['audio_gen_type'] = 'audioldm2'
            print("✓✓✓ AudioLDM-2 LOADED SUCCESSFULLY! ✓✓✓")
            print("="*60 + "\n")
            
        except ImportError as import_err:
            print(f"✗ AudioLDM2Pipeline not available in diffusers")
            print(f"  Error: {import_err}")
            print("  Solution: pip install --upgrade diffusers")
            print("\n→ Falling back to MusicGen...")
            
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
            model = MusicgenForConditionalGeneration.from_pretrained(
                "facebook/musicgen-small",
                torch_dtype=torch.float16
            ).to("cuda" if torch.cuda.is_available() else "cpu")
            MODEL_CACHE['audio_gen'] = (processor, model)
            MODEL_CACHE['audio_gen_type'] = 'musicgen'
            print("✓ MusicGen loaded as fallback")
            print("="*60 + "\n")
            
        except Exception as other_err:
            print(f"✗ AudioLDM-2 failed to load")
            print(f"  Error type: {type(other_err).__name__}")
            print(f"  Error message: {other_err}")
            print("\n→ Full traceback:")
            import traceback
            traceback.print_exc()
            print("\n→ Falling back to MusicGen...")
            
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
            model = MusicgenForConditionalGeneration.from_pretrained(
                "facebook/musicgen-small",
                torch_dtype=torch.float16
            ).to("cuda" if torch.cuda.is_available() else "cpu")
            MODEL_CACHE['audio_gen'] = (processor, model)
            MODEL_CACHE['audio_gen_type'] = 'musicgen'
            print("✓ MusicGen loaded as fallback")
            print("="*60 + "\n")
    
    if 'sfx_dataset' not in MODEL_CACHE:
        print("SFX dataset will be loaded on demand...")
        MODEL_CACHE['sfx_dataset'] = None
    
    return MODEL_CACHE

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

    user_prompt = f"Scene: {scene_description}\nMood: {mood_desc}\n\nGenerate soundscape JSON:"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    # Add attention mask
    if 'attention_mask' not in inputs:
        inputs['attention_mask'] = torch.ones_like(inputs['input_ids'])
    
    with torch.no_grad():
        outputs = model.generate(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['attention_mask'],
            max_new_tokens=512,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id
        )
    
    # Safely decode only the new tokens
    input_length = inputs['input_ids'].shape[1]
    if outputs.shape[1] > input_length:
        response = tokenizer.decode(outputs[0][input_length:], skip_special_tokens=True)
    else:
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract JSON from response
    try:
        # Find JSON in response
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
    
    return result

def generate_ambience(description: str, duration: int = 45) -> Tuple[np.ndarray, int]:
    """Generate ambient base layer using AudioLDM-2, Stable Audio or MusicGen"""
    
    if MODEL_CACHE.get('audio_gen_type') == 'audioldm2':
        pipe = MODEL_CACHE['audio_gen']
        prompt = f"ambient {description} soundscape, atmospheric, continuous, high quality"
        
        print(f"Generating ambience with AudioLDM-2: '{prompt}'")
        
        # AudioLDM-2 generates up to 10 seconds, so we'll generate and loop
        audio = pipe(
            prompt,
            num_inference_steps=200,  # Higher steps for better quality
            audio_length_in_s=10.0,
        ).audios[0]
        
        sample_rate = 16000  # AudioLDM-2 uses 16kHz
        
        # Loop to reach desired duration
        target_samples = int(duration * sample_rate)
        if len(audio) > 0:
            num_loops = (target_samples // len(audio)) + 1
            audio = np.tile(audio, num_loops)[:target_samples]
        
    elif MODEL_CACHE.get('audio_gen_type') == 'musicgen':
        processor, model = MODEL_CACHE['audio_gen']
        prompt = f"ambient {description} soundscape, continuous, looping, atmospheric"
        
        inputs = processor(
            text=[prompt],
            padding=True,
            return_tensors="pt",
        ).to(model.device)
        
        # Generate shorter clip and loop it (more stable)
        # MusicGen-small works best with ~10 seconds
        short_duration_tokens = 256  # ~5 seconds
        
        print(f"Generating {short_duration_tokens} tokens of ambience...")
        
        with torch.no_grad():
            audio_values = model.generate(
                **inputs, 
                max_new_tokens=short_duration_tokens, 
                do_sample=True,
                temperature=1.0
            )
        
        audio = audio_values[0].cpu().numpy()
        sample_rate = model.config.audio_encoder.sampling_rate
        
        print(f"Generated audio shape: {audio.shape}, sample_rate: {sample_rate}")
        
        # Ensure we have audio data
        if len(audio.shape) > 1:
            audio = audio[0]  # Take first channel if stereo
        
        # Ensure 1D
        audio = np.array(audio).flatten()
        
        # Loop the short clip to reach desired duration
        target_samples = int(duration * sample_rate)
        if len(audio) > 0:
            num_loops = (target_samples // len(audio)) + 1
            audio = np.tile(audio, num_loops)[:target_samples]
        else:
            # Fallback to silence if generation failed
            audio = np.zeros(target_samples)
        
    else:
        pipe = MODEL_CACHE['audio_gen']
        prompt = f"ambient {description}, atmospheric, continuous, high quality"
        
        audio = pipe(
            prompt,
            num_inference_steps=100,
            audio_end_in_s=duration,
        ).audios[0]
        
        sample_rate = 44100
    
    # Ensure mono
    if len(audio.shape) > 1:
        audio = audio.mean(axis=0)
    
    # Ensure audio is 1D array
    audio = np.array(audio).flatten()
    
    # Normalize safely
    max_abs = np.abs(audio).max()
    if max_abs > 1e-7:
        audio = audio / max_abs * 0.7
    
    return audio, sample_rate

def generate_sfx(sound_name: str, duration: float = 2.0) -> Tuple[np.ndarray, int]:
    """Generate or retrieve sound effect"""
    
    # Use AudioLDM-2 for SFX if available
    if MODEL_CACHE.get('audio_gen_type') == 'audioldm2':
        pipe = MODEL_CACHE['audio_gen']
        prompt = f"{sound_name} sound effect"
        
        print(f"Generating SFX: '{prompt}'")
        
        audio = pipe(
            prompt,
            num_inference_steps=100,
            audio_length_in_s=min(duration, 10.0),
        ).audios[0]
        
        sr = 16000
        
        # Ensure 1D and flatten
        audio = np.array(audio).flatten()
        
        # Trim or pad to exact duration
        target_len = int(duration * sr)
        if len(audio) > target_len:
            audio = audio[:target_len]
        else:
            audio = np.pad(audio, (0, max(0, target_len - len(audio))))
        
        return audio, sr
    
    # Use MusicGen for SFX generation
    elif MODEL_CACHE.get('audio_gen_type') == 'musicgen':
        processor, model = MODEL_CACHE['audio_gen']
        prompt = f"{sound_name} sound effect, clear, short"
        
        inputs = processor(
            text=[prompt],
            padding=True,
            return_tensors="pt",
        ).to(model.device)
        
        tokens = min(int(duration * 50), 256)  # Cap tokens for short SFX
        
        with torch.no_grad():
            audio_values = model.generate(**inputs, max_new_tokens=tokens, do_sample=True)
        
        audio = audio_values[0].cpu().numpy()
        sr = model.config.audio_encoder.sampling_rate
        
        # Ensure mono
        if len(audio.shape) > 1:
            audio = audio[0]
        
        # Ensure 1D and flatten
        audio = np.array(audio).flatten()
        
        # Trim or pad to exact duration
        target_len = int(duration * sr)
        if len(audio) > target_len:
            audio = audio[:target_len]
        else:
            audio = np.pad(audio, (0, max(0, target_len - len(audio))))
        
        return audio, sr
    
    # Fallback: simple noise burst
    sr = 44100
    samples = int(duration * sr)
    envelope = np.exp(-np.linspace(0, 5, samples))
    audio = np.random.randn(samples) * 0.3 * envelope
    
    return audio, sr

def apply_effects(audio: np.ndarray, sr: int, pan: float, volume: float, add_reverb: bool = True) -> np.ndarray:
    """Apply spatial effects using pedalboard"""
    # Ensure audio is 1D
    audio = np.array(audio).flatten()
    
    # Convert to stereo
    audio_stereo = np.stack([audio, audio])
    
    # Ensure audio_stereo is 2D with shape (2, N)
    if audio_stereo.shape[0] != 2:
        audio_stereo = audio_stereo.T
    
    try:
        # Create effects board
        board = Pedalboard()
        
        if add_reverb:
            board.append(Reverb(room_size=0.3, damping=0.5, wet_level=0.15))
        
        # Safe gain calculation
        gain_db = 20 * np.log10(max(volume, 1e-7))
        gain_db = np.clip(gain_db, -60, 20)  # Limit gain range
        board.append(Gain(gain_db=float(gain_db)))

        # Apply effects
        audio_processed = board(audio_stereo, sr)
        
        # Ensure correct shape
        if audio_processed.shape[0] != 2:
            audio_processed = audio_processed.T
    except Exception as e:
        print(f"Effect processing warning: {e}, using dry signal")
        audio_processed = audio_stereo

    # Manual equal-power panning
    pan = np.clip(pan, -1.0, 1.0)
    angle = (pan + 1.0) * (np.pi / 4.0)
    left_gain = np.cos(angle)
    right_gain = np.sin(angle)

    # Apply panning
    audio_processed[0, :] *= left_gain
    audio_processed[1, :] *= right_gain
    
    return audio_processed

def mix_soundscape(ambience: np.ndarray, events: List[Dict], sr: int, duration: int, loopable: bool) -> np.ndarray:
    """Mix all audio elements into final soundscape"""
    # Create stereo canvas
    total_samples = int(duration * sr)
    canvas = np.zeros((2, total_samples))
    
    # Ensure ambience is 1D
    ambience = np.array(ambience).flatten()
    
    # Add ambience (loop if needed)
    amb_stereo = np.stack([ambience, ambience])
    amb_samples = amb_stereo.shape[1]
    
    # Loop ambience across the full duration
    for i in range(0, total_samples, amb_samples):
        end = min(i + amb_samples, total_samples)
        chunk_len = end - i
        canvas[:, i:end] = amb_stereo[:, :chunk_len] * 0.5
    
    # Add events
    for idx, event in enumerate(events):
        try:
            timing = float(event.get('timing', 0))
            if timing >= duration - 2:  # Leave 2 seconds buffer
                continue
            
            print(f"Processing event {idx+1}/{len(events)}: {event['sound']} at {timing}s")
            
            sfx, sfx_sr = generate_sfx(event['sound'], duration=2.0)
            
            # Resample if needed
            if sfx_sr != sr:
                sfx = librosa.resample(sfx, orig_sr=sfx_sr, target_sr=sr)
            
            # Apply effects
            sfx_processed = apply_effects(
                sfx, sr,
                pan=float(event.get('pan', 0)),
                volume=float(event.get('volume', 0.6)),
                add_reverb=True
            )
            
            # Ensure correct shape
            if sfx_processed.shape[0] != 2:
                sfx_processed = sfx_processed.T
            
            # Place in timeline with bounds checking
            start_sample = int(timing * sr)
            start_sample = max(0, min(start_sample, total_samples - 1))
            
            sfx_len = sfx_processed.shape[1]
            end_sample = min(start_sample + sfx_len, total_samples)
            length = end_sample - start_sample
            
            if length > 0:
                canvas[:, start_sample:end_sample] += sfx_processed[:, :length] * 0.8
            
        except Exception as e:
            print(f"Error adding event {event.get('sound', 'unknown')}: {e}")
            continue
    
    # Fade in/out for loopable
    if loopable:
        fade_samples = int(0.5 * sr)
        fade_samples = min(fade_samples, total_samples // 4)  # Don't fade more than 25%
        
        if fade_samples > 0:
            fade_in = np.linspace(0, 1, fade_samples)
            fade_out = np.linspace(1, 0, fade_samples)
            
            canvas[:, :fade_samples] *= fade_in
            canvas[:, -fade_samples:] *= fade_out
    
    # Normalize safely
    max_val = np.abs(canvas).max()
    if max_val > 1e-7:
        canvas = canvas / max_val * 0.9
    
    return canvas

def create_soundscape(
    scene_description: str,
    mood: float,
    event_intensity: float,
    loopable: bool,
    progress=gr.Progress()
) -> Tuple[str, str]:
    """Main pipeline to create soundscape"""
    
    if not scene_description.strip():
        return None, "Please enter a scene description"
    
    try:
        # Load models
        progress(0.1, desc="Loading models...")
        load_models()
        
        # Refine prompt
        progress(0.2, desc="Analyzing scene...")
        soundscape_spec = refine_prompt(scene_description, mood)
        
        # Adjust event count based on intensity
        num_events = max(1, int(len(soundscape_spec['events']) * event_intensity))
        soundscape_spec['events'] = soundscape_spec['events'][:num_events]
        
        spec_json = json.dumps(soundscape_spec, indent=2)
        
        # Generate ambience
        progress(0.4, desc="Generating ambience...")
        ambience, sr = generate_ambience(soundscape_spec['ambience'], duration=45)
        
        # Mix soundscape
        progress(0.7, desc="Adding sound events...")
        final_audio = mix_soundscape(
            ambience,
            soundscape_spec['events'],
            sr,
            duration=45,
            loopable=loopable
        )
        
        # Save output
        progress(0.9, desc="Saving audio...")
        output_path = "soundscape_output.wav"
        sf.write(output_path, final_audio.T, sr)
        
        progress(1.0, desc="Complete!")
        
        return output_path, f"✅ Generated soundscape!\n\n**Specification:**\n```json\n{spec_json}\n```"
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(error_details)
        return None, f"❌ Error: {str(e)}\n\nDetails:\n{error_details}"

# Create Gradio interface
with gr.Blocks(title="Text-to-Soundscape Composer", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🎵 Text-to-Soundscape Composer
    
    Generate immersive, layered soundscapes from text descriptions using open-source Hugging Face models.
    
    **Example prompts:**
    - "rainy forest chase at dusk with thunder"
    - "busy medieval marketplace with horses and crowd chatter"
    - "sci-fi spaceship interior with alarms and computer beeps"
    - "peaceful beach at sunset with gentle waves and seagulls"
    """)
    
    with gr.Row():
        with gr.Column(scale=2):
            scene_input = gr.Textbox(
                label="Scene Description",
                placeholder="Describe the scene you want to hear...",
                lines=3
            )
            
            with gr.Row():
                mood_slider = gr.Slider(
                    minimum=0,
                    maximum=1,
                    value=0.5,
                    label="Mood (0=calm, 1=epic)",
                    step=0.1
                )
                
                intensity_slider = gr.Slider(
                    minimum=0.1,
                    maximum=2.0,
                    value=1.0,
                    label="Event Intensity",
                    step=0.1
                )
            
            loopable_check = gr.Checkbox(
                label="Make it loopable (adds crossfade)",
                value=True
            )
            
            generate_btn = gr.Button("🎼 Generate Soundscape", variant="primary", size="lg")
        
        with gr.Column(scale=3):
            audio_output = gr.Audio(label="Generated Soundscape", type="filepath")
            status_output = gr.Markdown("")
    
    gr.Markdown("""
    ---
    ### 🚀 Features
    - **Discrete event control**: Individual sound effects with timing and spatial positioning
    - **Stereo panning**: Full left-right positioning of sounds
    - **Open weights**: All models are open-source and runnable locally
    - **Reverb & effects**: Professional audio processing with pedalboard
    
    ### 🔧 Powered by
    - LLM: Qwen2-1.5B-Instruct (prompt refinement)
    - Audio: AudioLDM-2 / Stable-Audio-Open / MusicGen (generation)
    - Processing: Pedalboard, Torchaudio, Librosa
    """)
    
    generate_btn.click(
        fn=create_soundscape,
        inputs=[scene_input, mood_slider, intensity_slider, loopable_check],
        outputs=[audio_output, status_output]
    )

if __name__ == "__main__":
    demo.launch()