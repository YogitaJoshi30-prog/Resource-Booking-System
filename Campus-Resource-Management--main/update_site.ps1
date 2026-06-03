$htmlFiles = Get-ChildItem -Path . -Filter *.html | Where-Object { $_.Name -ne 'coming-soon.html' }

$fixedNav = @"
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
"@

foreach ($file in $htmlFiles) {
    # Read content properly interpreting newlines
    $content = [IO.File]::ReadAllText($file.FullName)
    
    # 1. Update <link rel="stylesheet"...
    if ($content -notmatch 'global.css') {
        $content = [regex]::Replace($content, '(<link rel="stylesheet".*?>)', "<link rel=`"stylesheet`" href=`"global.css`">`n    `$1", 1)
    }
    
    # 2. Fix ATTENDANCE
    $content = $content.Replace("ATTENDANCE.HTML", "ATTENDANCE.html")
    
    # 3. Fix IP links
    $content = [regex]::Replace($content, 'http://127\.0\.0\.1:5501/yogesh/main\.html(#\w+)?', 'main.html')
    $content = [regex]::Replace($content, 'http://127\.0\.0\.1:5501/yogesh/([a-zA-Z0-9_\-\.]+)', '$1')
    
    # 4. In Modules section, link placeholder items to coming-soon.html
    $content = [regex]::Replace($content, '<a href="#">\s*<i class="([^"]+)"></i>\s*</a>', '<a href="coming-soon.html"><i class="$1"></i></a>')
    
    # 5. Overwrite nav block
    $content = [regex]::Replace($content, '(?s)<nav>.*?</nav>', $fixedNav)
    
    [IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "HTML files dynamically updated via PowerShell."
