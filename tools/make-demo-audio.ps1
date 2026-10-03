param(
    [string]$OutDir = "D:\OpenCode\projects\mj_music_player\android\app\src\main\assets\www\audio",
    [int]$Rate = 22050,
    [int]$Seconds = 16
)
# Tao 3 ban nhac demo (WAV 16-bit mono) - khong dung bat ky file nhac co ban quyen nao.
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

function New-Wav([double[]]$samples, [string]$path, [int]$rate) {
    $n = $samples.Count
    $dataLen = $n * 2
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    $bw.Write([char[]]'RIFF'); $bw.Write([int](36 + $dataLen)); $bw.Write([char[]]'WAVE')
    $bw.Write([char[]]'fmt '); $bw.Write([int]16)
    $bw.Write([int16]1); $bw.Write([int16]1)
    $bw.Write([int]$rate); $bw.Write([int]($rate * 2))
    $bw.Write([int16]2); $bw.Write([int16]16)
    $bw.Write([char[]]'data'); $bw.Write([int]$dataLen)
    foreach ($s in $samples) {
        $v = [int]($s * 32000)
        if ($v -gt 32767) { $v = 32767 }; if ($v -lt -32768) { $v = -32768 }
        $bw.Write([int16]$v)
    }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($path, $ms.ToArray())
    $bw.Dispose(); $ms.Dispose()
}

# Moc X giong A4 = 440Hz
function Get-Note($n) { 440.0 * [Math]::Pow(2, ($n - 69) / 12.0) }

function New-Track([double[]]$notes, [double]$noteDur, [double]$amp, [int]$octave, [string]$name) {
    $total = [int]($Rate * $Seconds)
    $buf = New-Object double[] $total
    $pos = 0.0
    foreach ($n in $notes) {
        $freq = Get-Note ($n + 12 * $octave)
        $len = [int]($noteDur * $Rate)
        for ($i = 0; $i -lt $len -and $pos -lt $total; $i++) {
            $t = $i / $Rate
            # ADSR don gian: attack 8ms, decay xuong duoi
            $env = [Math]::Min(1.0, $t / 0.008) * [Math]::Exp(-$t * 3.2)
            # giong chuong: sin co hai hoa + sin goc
            $v = [Math]::Sin(2 * [Math]::PI * $freq * $t) * 0.6
            $v += [Math]::Sin(4 * [Math]::PI * $freq * $t) * 0.18
            $v += [Math]::Sin(6 * [Math]::PI * $freq * $t) * 0.07
            $buf[$pos] += $v * $env * $amp
            $pos++
        }
        $pos += [int](0.06 * $Rate)   # khoang lang giua cac not
    }
    # chuan hoa + fade out 1.5s cuoi
    $fade = [int](1.5 * $Rate)
    for ($i = 0; $i -lt $total; $i++) {
        $f = 1.0
        if ($i -gt ($total - $fade)) { $f = ($total - $i) / $fade }
        $v = $buf[$i] * $f
        $buf[$i] = [Math]::Max(-0.98, [Math]::Min(0.98, $v))
    }
    $p = Join-Path $OutDir $name
    New-Wav $buf $p $Rate
    "  $name -> $([math]::Round((Get-Item $p).Length/1KB,0)) KB"
}

"Sinh nhac demo..."
# 1. Aurora - arpeggio C major
New-Track @(72,76,79,83, 79,76,72,74, 72,76,79,83, 81,79,76,74) 0.30 0.30 0 'aurora.wav'
# 2. Midnight - Am F C G, am
New-Track @(69,72,76, 65,69,72, 60,64,67, 67,71,74) 0.42 0.26 0 'midnight.wav'
# 3. Pulse - chuoi nhanh nhip
New-Track @(60,63,67,70,72,70,67,63) 0.16 0.28 0 'pulse.wav'

""
"Tong: $([math]::Round(((Get-ChildItem $OutDir -File | Measure-Object Length -Sum).Sum)/1MB,2)) MB"