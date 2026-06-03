import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

fixed_nav = """
    <nav>
        <h1 class="logo">Campus Suite</h1>
        <ul id="sidemenu">
            <li><a href="main.html">Home</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="modules.html">Modules</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li class="logout"><a href="registration.html"><i class="fa-solid fa-right-from-bracket"></i></a></li>
        </ul>
    </nav>
"""

for file in html_files:
    if file == 'coming-soon.html': continue
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update <link rel="stylesheet"... to inject global.css if not present
    if 'global.css' not in content:
        # find the first CSS link
        content = re.sub(r'(<link rel="stylesheet".*?>)', r'<link rel="stylesheet" href="global.css">\n    \1', content, count=1)
    
    # 2. Fix the ATTENDANCE.HTML bug
    content = content.replace('ATTENDANCE.HTML', 'ATTENDANCE.html')
    
    # 3. Fix hardcoded 127.0.0.1 links
    content = re.sub(r'http://127\.0\.0\.1:5501/yogesh/main\.html(#\w+)?', 'main.html', content)
    content = re.sub(r'http://127\.0\.0\.1:5501/yogesh/([a-zA-Z0-9_\-\.]+)', r'\1', content)
    
    # 4. In Modules section, link href="#" to coming-soon.html, but NOT the Assignment Test if it was #
    # Actually, any <a href="#"> inside an icon div
    content = re.sub(r'<a href="#"><i class="([^"]+)"></i></a>', r'<a href="coming-soon.html"><i class="\1"></i></a>', content)
    
    # 5. Overwrite the diverse <nav> blocks with the uniform one
    # This regex matches from <nav> to </nav>
    content = re.sub(r'<nav>.*?</nav>', fixed_nav.strip(), content, flags=re.DOTALL)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML files successfully updated!")
