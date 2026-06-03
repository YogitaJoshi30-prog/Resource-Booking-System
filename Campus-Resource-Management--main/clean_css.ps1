$cssFiles = Get-ChildItem -Path . -Filter *.css | Where-Object { $_.Name -ne 'global.css' }

foreach ($file in $cssFiles) {
    $content = [IO.File]::ReadAllText($file.FullName)
    
    # Remove universal selector
    $content = [regex]::Replace($content, '(?s)\*\{[^\}]+\}', '')
    
    # Remove body styling
    $content = [regex]::Replace($content, '(?s)body\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)html\s*\{[^\}]+\}', '')
    
    # Remove old nav and header styling that conflicts
    $content = [regex]::Replace($content, '(?s)nav\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)#header\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)\.logo\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)nav ul li\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)nav ul li a\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)nav ul li a::after\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)nav ul li a:hover::after\s*\{[^\}]+\}', '')
    $content = [regex]::Replace($content, '(?s)\.container\s*\{[^\}]+\}', '.container { width: 100%; min-height: 100vh; padding: 2rem; display: flex; flex-direction: column; align-items: center; }')
    
    [IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "CSS files cleaned up to let global.css take over."
