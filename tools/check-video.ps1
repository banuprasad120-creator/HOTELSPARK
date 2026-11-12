$path = "C:\Users\banup\Downloads\HOTEL SAAS\apps\booking\public\spark.mp4"
$shell = New-Object -ComObject 'Shell.Application'
$folder = $shell.Namespace((Split-Path $path))
$file = $folder.ParseName((Split-Path $path -Leaf))
$props = @{}
for ($i = 0; $i -lt 320; $i++) {
    $name = $folder.GetDetailsOf($null, $i)
    $val = $folder.GetDetailsOf($file, $i)
    if ($val -and $name) {
        $props[$name] = $val
    }
}
$props.GetEnumerator() | Sort-Object Name | Format-Table -AutoSize

