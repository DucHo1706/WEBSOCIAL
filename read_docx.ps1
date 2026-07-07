[System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
$docxFile = Get-ChildItem -Path "d:\WEB\WEBBIRHDAY" -Filter "*.docx" | Select-Object -First 1
if ($docxFile -eq $null) {
    Write-Error "No DOCX file found in workspace"
    exit 1
}
$docxPath = $docxFile.FullName
Write-Output "Opening file: $docxPath"
$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry("word/document.xml")
if ($entry -eq $null) {
    Write-Error "Could not find word/document.xml inside docx"
    $zip.Dispose()
    exit 1
}
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlText = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$xml = [xml]$xmlText
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$paragraphs = $xml.SelectNodes("//w:p", $ns)
$lines = New-Object System.Collections.Generic.List[string]

foreach ($p in $paragraphs) {
    $textNodes = $p.SelectNodes(".//w:t", $ns)
    $pText = ""
    foreach ($t in $textNodes) {
        $pText += $t.InnerText
    }
    $lines.Add($pText)
}

$lines | Out-File -FilePath "d:\WEB\WEBBIRHDAY\doc_content.txt" -Encoding utf8
Write-Output "Successfully extracted document text."
