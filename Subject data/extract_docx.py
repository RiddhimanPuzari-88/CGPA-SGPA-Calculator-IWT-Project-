import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r"c:\Users\Riddhi_man\Documents\IWT\Subject data\CSE_COURSE_STRUCT_2023_Batch (2).docx"
try:
    with zipfile.ZipFile(docx_path) as docx:
        xml_content = docx.read('word/document.xml')
        
    tree = ET.fromstring(xml_content)
    
    # namespaces in docx
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    texts = []
    for node in tree.iter(f"{{{ns['w']}}}t"):
        if node.text:
            texts.append(node.text)
            
    text_content = ''.join(texts)
    
    # Let's save it to a text file with some basic formatting or just print it.
    # Since XML tags don't easily give structure without parsing paragraphs, we'll parse paragraphs.
    
    paragraphs = []
    for p in tree.iter(f"{{{ns['w']}}}p"):
        p_text = []
        for node in p.iter(f"{{{ns['w']}}}t"):
            if node.text:
                p_text.append(node.text)
        if p_text:
            paragraphs.append(''.join(p_text))
            
    with open(r"c:\Users\Riddhi_man\Documents\IWT\Subject data\extracted.txt", "w", encoding="utf-8") as f:
        f.write('\n'.join(paragraphs))
    print("Extraction successful.")
except Exception as e:
    print(f"Error: {e}")
