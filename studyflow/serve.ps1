$port = 3000
$root = "C:\Users\Abdul\.gemini\antigravity\scratch\studyflow"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "StudyFlow server started on http://localhost:$port/"
} catch {
    $port = 3001
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    Write-Host "StudyFlow server started on http://localhost:$port/"
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
}

function Get-GeminiApiKey() {
    $key = $env:GEMINI_API_KEY
    if (![string]::IsNullOrWhiteSpace($key)) {
        return $key.Trim()
    }
    $envPath = Join-Path $root ".env"
    if (Test-Path $envPath) {
        $lines = Get-Content $envPath
        foreach ($line in $lines) {
            if ($line -match "^\s*GEMINI_API_KEY\s*=\s*(.*)$") {
                $val = $matches[1].Trim().Trim('"').Trim("'")
                if (![string]::IsNullOrWhiteSpace($val)) {
                    return $val
                }
            }
        }
    }
    return ""
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "/index.html"
        }

        # ------------------------------------------------------------------
        # SERVER-SIDE ENDPOINT: POST /api/ai/chat
        # Proxies chat and flashcard prompts to Google Gemini API securely.
        # Browser never sees, transmits, or injects the API key.
        # ------------------------------------------------------------------
        if ($urlPath -eq "/api/ai/chat" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $reqBody = $reader.ReadToEnd()
            $reader.Close()

            $prompt = ""
            $systemInstruction = ""
            try {
                $jsonReq = $reqBody | ConvertFrom-Json
                if ($jsonReq) {
                    $prompt = [string]$jsonReq.prompt
                    $systemInstruction = [string]$jsonReq.systemInstruction
                }
            } catch {}

            $apiKey = Get-GeminiApiKey

            if ([string]::IsNullOrWhiteSpace($apiKey)) {
                $errJson = @{ error = "GEMINI_API_KEY is not configured on the server. Falling back to local offline reasoning." } | ConvertTo-Json -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 503
                $response.ContentType = "application/json; charset=utf-8"
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            try {
                $contents = @()
                if (![string]::IsNullOrWhiteSpace($systemInstruction)) {
                    $contents += @{
                        role = "user"
                        parts = @(@{ text = "System Instruction: $systemInstruction" })
                    }
                    $contents += @{
                        role = "model"
                        parts = @(@{ text = "Understood. I will act as the StudyFlow AI Teacher following these instructions." })
                    }
                }
                $contents += @{
                    role = "user"
                    parts = @(@{ text = $prompt })
                }

                $geminiBody = @{
                    contents = $contents
                    generationConfig = @{
                        temperature = 0.7
                        maxOutputTokens = 1200
                    }
                } | ConvertTo-Json -Depth 6

                $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
                $geminiRes = Invoke-RestMethod -Uri $geminiUrl -Method Post -ContentType "application/json" -Body $geminiBody -TimeoutSec 30

                $replyText = $geminiRes.candidates[0].content.parts[0].text
                $successJson = @{ text = $replyText } | ConvertTo-Json -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($successJson)

                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $errMsg = $_.Exception.Message
                $errJson = @{ error = "Upstream Gemini API error: $errMsg" } | ConvertTo-Json -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)

                $response.StatusCode = 502
                $response.ContentType = "application/json; charset=utf-8"
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $response.Close()
            continue
        }

        # ------------------------------------------------------------------
        # SERVER-SIDE ENDPOINT: GET /api/ai/status
        # Reports whether server has GEMINI_API_KEY configured without exposing it.
        # ------------------------------------------------------------------
        if ($urlPath -eq "/api/ai/status" -and $request.HttpMethod -eq "GET") {
            $apiKey = Get-GeminiApiKey
            $statusJson = @{ configured = (![string]::IsNullOrWhiteSpace($apiKey)) } | ConvertTo-Json -Compress
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($statusJson)

            $response.StatusCode = 200
            $response.ContentType = "application/json; charset=utf-8"
            $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # ------------------------------------------------------------------
        # SECURITY PROTECTION: Prevent access to .env, dotfiles, or sensitive files
        # ------------------------------------------------------------------
        $relative = $urlPath.TrimStart("/").Replace("/", "\")
        if ($relative -like ".*" -or $relative -like "*\.env*" -or $relative -like "*\.*") {
            $response.StatusCode = 403
            $err = [System.Text.Encoding]::UTF8.GetBytes("Access Denied")
            $response.ContentLength64 = $err.Length
            $response.OutputStream.Write($err, 0, $err.Length)
            $response.Close()
            continue
        }

        # ------------------------------------------------------------------
        # STATIC FILE SERVING
        # ------------------------------------------------------------------
        $filePath = Join-Path $root $relative
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
            $response.ContentLength64 = $err.Length
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.Close()
    } catch {
        # Catch connection disconnects
    }
}
