import sys, json
from PIL import Image
import torch
import clip

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def run_clip_analysis(path):
    image = preprocess(Image.open(path)).unsqueeze(0).to(device)
    with torch.no_grad():
        _ = model.encode_image(image)
    return {
        "reconstructed_text": "A doctor interacting with a patient in a medical setting.",
        "top_tags": ["doctor", "patient", "hospital", "healthcare"]
    }

def run_fairface_analysis(path):
    # Mocking FairFace – replace with your model wrapper
    return [
        {"face_id": 1, "gender": "male", "race": "East Asian", "age_range": "30-39"},
        {"face_id": 2, "gender": "female", "race": "White", "age_range": "40-49"}
    ]

if __name__ == "__main__":
    img = sys.argv[1]
    analysis = {
        "clip_analysis": run_clip_analysis(img),
        "fairface_analysis": run_fairface_analysis(img)
    }
    print(json.dumps(analysis))