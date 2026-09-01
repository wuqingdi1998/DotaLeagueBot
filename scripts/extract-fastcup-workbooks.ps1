param(
    [Parameter(Mandatory = $true)]
    [string[]]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

function Convert-ExcelValue {
    param([object]$Value)

    if ($null -eq $Value) {
        return $null
    }
    if ($Value -is [double] -and $Value -ge 30000 -and $Value -le 70000) {
        return [DateTime]::FromOADate($Value).ToString("yyyy-MM-dd")
    }
    return $Value
}

function Read-WorksheetMatrix {
    param([object]$Worksheet)

    $usedRange = $Worksheet.UsedRange
    $values = $usedRange.Value2
    $rowCount = $usedRange.Rows.Count
    $columnCount = $usedRange.Columns.Count
    $lastRow = 0
    $lastColumn = 0

    for ($row = 1; $row -le $rowCount; $row++) {
        for ($column = 1; $column -le $columnCount; $column++) {
            $value = $values[$row, $column]
            if ($null -ne $value -and [string]$value -ne "") {
                $lastRow = [Math]::Max($lastRow, $row)
                $lastColumn = [Math]::Max($lastColumn, $column)
            }
        }
    }

    $rows = @()
    $displayRows = @()
    $hyperlinkRows = @()
    for ($row = 1; $row -le $lastRow; $row++) {
        $rowValues = @()
        $displayValues = @()
        $hyperlinkValues = @()
        for ($column = 1; $column -le $lastColumn; $column++) {
            $rowValues += Convert-ExcelValue $values[$row, $column]
            $cell = $usedRange.Cells.Item($row, $column)
            $displayValues += $cell.Text
            $hyperlinkValues += if ($cell.Hyperlinks.Count -gt 0) {
                $cell.Hyperlinks.Item(1).Address
            }
            else {
                $null
            }
        }
        $rows += ,$rowValues
        $displayRows += ,$displayValues
        $hyperlinkRows += ,$hyperlinkValues
    }

    return @{
        Name = $Worksheet.Name
        IsVisible = $Worksheet.Visible -eq -1
        Rows = $rows
        DisplayRows = $displayRows
        HyperlinkRows = $hyperlinkRows
        RowCount = $lastRow
        ColumnCount = $lastColumn
    }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$result = @()

try {
    foreach ($sourcePath in $InputPath) {
        $resolvedPath = (Resolve-Path -LiteralPath $sourcePath).Path
        $workbook = $excel.Workbooks.Open($resolvedPath, 0, $true)
        try {
            $sheets = @()
            foreach ($worksheet in $workbook.Worksheets) {
                $sheets += Read-WorksheetMatrix $worksheet
            }
            $result += @{
                FileName = [IO.Path]::GetFileName($resolvedPath)
                Sheets = $sheets
            }
        }
        finally {
            $workbook.Close($false)
            [Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) |
                Out-Null
        }
    }
}
finally {
    $excel.Quit()
    [Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

$result |
    ConvertTo-Json -Depth 100 -Compress |
    Set-Content -LiteralPath $OutputPath -Encoding UTF8
