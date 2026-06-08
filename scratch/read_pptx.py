import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def extract_text_from_pptx(pptx_path):
    if not os.path.exists(pptx_path):
        return f"Error: File not found - {pptx_path}"

    namespaces = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
    text_runs = []
    
    try:
        with zipfile.ZipFile(pptx_path) as z:
            # Find all slide files
            slide_files = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
            # Sort slides by number
            slide_files.sort(key=lambda x: int(x.replace('ppt/slides/slide', '').replace('.xml', '')))
            
            for slide_idx, slide_file in enumerate(slide_files, 1):
                slide_xml = z.read(slide_file)
                root = ET.fromstring(slide_xml)
                texts = root.findall('.//a:t', namespaces)
                slide_text = [t.text for t in texts if t.text]
                
                text_runs.append(f"--- Slide {slide_idx} ---")
                if slide_text:
                    text_runs.extend(slide_text)
                else:
                    text_runs.append("[No text found or image-only slide]")
                text_runs.append("")
                
        return '\n'.join(text_runs)
    except Exception as e:
        return f"Error parsing pptx: {e}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python read_pptx.py <path_to_pptx>")
        sys.exit(1)
        
    pptx_path = sys.argv[1]
    print(extract_text_from_pptx(pptx_path))
