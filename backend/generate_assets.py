from PIL import Image, ImageDraw, ImageFont
import os

public_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
os.makedirs(public_dir, exist_ok=True)

# 1. Generate apple-touch-icon.png (180x180)
icon = Image.new("RGBA", (180, 180), (15, 118, 110, 255))
draw = ImageDraw.Draw(icon)
# Draw magnifying glass
draw.ellipse([35, 35, 115, 115], outline=(255, 255, 255), width=14)
draw.line([95, 95, 145, 145], fill=(255, 255, 255), width=14)
draw.ellipse([65, 65, 85, 85], fill=(180, 83, 9, 255))
icon_path = os.path.join(public_dir, "apple-touch-icon.png")
icon.save(icon_path, "PNG")
print(f"Generated {icon_path}")

# 2. Generate favicon.ico (32x32)
fav32 = icon.resize((32, 32), Image.Resampling.LANCZOS)
ico_path = os.path.join(public_dir, "favicon.ico")
fav32.save(ico_path, format="ICO")
print(f"Generated {ico_path}")

# 3. Generate og-image.png (1200x630)
og = Image.new("RGB", (1200, 630), (15, 118, 110))
og_draw = ImageDraw.Draw(og)

# Decorative background accents
og_draw.rectangle([0, 600, 1200, 630], fill=(180, 83, 9))
og_draw.ellipse([1000, -100, 1400, 300], fill=(17, 94, 89))
og_draw.ellipse([-100, 400, 300, 800], fill=(17, 94, 89))

# Magnifying glass badge
og_draw.rounded_rectangle([100, 120, 220, 240], radius=24, fill=(17, 94, 89))
og_draw.ellipse([130, 145, 180, 195], outline=(255, 255, 255), width=8)
og_draw.line([168, 183, 195, 210], fill=(255, 255, 255), width=8)
og_draw.ellipse([150, 165, 160, 175], fill=(245, 158, 11))

# Text layout
og_draw.text((250, 150), "khojbeen.ai", fill=(255, 255, 255))
og_draw.text((100, 290), "Campus Lost & Found Intelligent Matcher", fill=(255, 255, 255))
og_draw.text((100, 370), "Khoya hai? Khojbeen karega.", fill=(245, 158, 11))
og_draw.text((100, 440), "Jagran College Hackathon 2026 - Problem Statement 02", fill=(204, 251, 241))
og_draw.text((100, 480), "Automated NLP Similarity * TF-IDF Matching * Verified Claims", fill=(204, 251, 241))

og_path = os.path.join(public_dir, "og-image.png")
og.save(og_path, "PNG", optimize=True)
print(f"Generated {og_path} (size: {os.path.getsize(og_path)/1024:.1f} KB)")
