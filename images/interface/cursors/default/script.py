import os
from PIL import Image

def convert_current_folder():
    """Конвертирует все APNG в текущей папке"""
    for file in os.listdir("."):
        if file.lower().endswith(".png"):
            try:
                with Image.open(file) as img:
                    if not getattr(img, "is_animated", False):
                        continue
                    
                    print(f"Обрабатывается: {file}")
                    
                    frames = []
                    for frame in range(img.n_frames):
                        img.seek(frame)
                        frames.append(img.convert("RGBA"))
                    
                    output_file = f"60fps_{file}"
                    frames[0].save(
                        output_file,
                        save_all=True,
                        append_images=frames[1:],
                        duration=17,
                        loop=0,
                        optimize=False
                    )
                    print(f"Создан: {output_file}")
                    
            except Exception as e:
                print(f"Ошибка с {file}: {e}")

if __name__ == "__main__":
    convert_current_folder()