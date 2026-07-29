param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$workbooks = @(
    @{
        Season = 4
        Path = "C:\Users\Ivan\Downloads\Linken's Sphere 5x5 League Season 4.xlsx"
    },
    @{
        Season = 5
        Path = "C:\Users\Ivan\Downloads\Linken's Sphere 5x5 League Season 5.xlsx"
    },
    @{
        Season = 6
        Path = "C:\Users\Ivan\Downloads\Linken's Sphere eSports 5x5 League Season 6.xlsx"
    },
    @{
        Season = 7
        Path = (
            Get-ChildItem -LiteralPath "C:\Users\Ivan\Downloads" |
                Where-Object {
                    $_.Name -like "Linken's Sphere eSports 5x5 League Season 7*.xlsx"
                } |
                Select-Object -First 1 -ExpandProperty FullName
        )
    }
)

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
    for ($row = 1; $row -le $lastRow; $row++) {
        $rowValues = @()
        for ($column = 1; $column -le $lastColumn; $column++) {
            $rowValues += Convert-ExcelValue $values[$row, $column]
        }
        $rows += ,$rowValues
    }

    return @{
        Name = $Worksheet.Name
        Rows = $rows
        RowCount = $lastRow
        ColumnCount = $lastColumn
    }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$result = @()

try {
    foreach ($workbookSource in $workbooks) {
        $workbook = $excel.Workbooks.Open(
            $workbookSource.Path,
            0,
            $true
        )
        try {
            $sheets = @()
            foreach ($worksheet in $workbook.Worksheets) {
                $sheets += Read-WorksheetMatrix $worksheet
            }
            $result += @{
                Season = $workbookSource.Season
                FileName = [IO.Path]::GetFileName($workbookSource.Path)
                Sheets = $sheets
            }
        }
        finally {
            $workbook.Close($false)
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
