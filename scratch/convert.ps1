$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("C:\Users\CHL\Flatfolks\Flatfolks.docx")
$doc.SaveAs("C:\Users\CHL\Flatfolks\scratch\Flatfolks.txt", 2)
$doc.Close()
$word.Quit()
Write-Host "Done"
