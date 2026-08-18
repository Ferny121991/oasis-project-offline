<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=120');

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$maxResults = isset($_GET['max']) ? max(1, min(30, intval($_GET['max']))) : 18;

if ($query === '') {
  http_response_code(400);
  echo json_encode(['results' => [], 'error' => 'q required']);
  exit;
}

if (function_exists('mb_substr')) {
  $query = mb_substr($query, 0, 160, 'UTF-8');
} else {
  $query = substr($query, 0, 160);
}

function oasis_fetch_url($url) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_TIMEOUT => 18,
      CURLOPT_ENCODING => '',
      CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      CURLOPT_HTTPHEADER => [
        'Accept-Language: es-419,es;q=0.9,en;q=0.7',
        'Cookie: CONSENT=YES+cb.20210328-17-p0.en+FX+471'
      ]
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($status >= 200 && $status < 300 && is_string($body)) ? $body : '';
  }

  $context = stream_context_create([
    'http' => [
      'method' => 'GET',
      'timeout' => 18,
      'header' => "User-Agent: Mozilla/5.0\r\nAccept-Language: es-419,es;q=0.9,en;q=0.7\r\nCookie: CONSENT=YES+cb.20210328-17-p0.en+FX+471\r\n"
    ]
  ]);
  $body = @file_get_contents($url, false, $context);
  return is_string($body) ? $body : '';
}

function oasis_post_json($url, $payload) {
  $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_TIMEOUT => 18,
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $body,
      CURLOPT_ENCODING => '',
      CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Origin: https://www.youtube.com',
        'Referer: https://www.youtube.com/'
      ]
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($status >= 200 && $status < 300 && is_string($response)) ? $response : '';
  }

  $context = stream_context_create([
    'http' => [
      'method' => 'POST',
      'timeout' => 18,
      'header' => "Content-Type: application/json\r\nAccept: application/json\r\nOrigin: https://www.youtube.com\r\nReferer: https://www.youtube.com/\r\nUser-Agent: Mozilla/5.0\r\n",
      'content' => $body
    ]
  ]);
  $response = @file_get_contents($url, false, $context);
  return is_string($response) ? $response : '';
}

function oasis_text($node, $fallback = '') {
  if (!is_array($node)) return $fallback;
  if (isset($node['simpleText']) && is_string($node['simpleText'])) return trim($node['simpleText']);
  if (isset($node['runs']) && is_array($node['runs'])) {
    $parts = [];
    foreach ($node['runs'] as $run) {
      if (isset($run['text']) && is_string($run['text'])) $parts[] = $run['text'];
    }
    $value = trim(implode('', $parts));
    if ($value !== '') return $value;
  }
  return $fallback;
}

function oasis_thumbnail($renderer, $fallback) {
  $sources = [];
  if (isset($renderer['thumbnail']['thumbnails']) && is_array($renderer['thumbnail']['thumbnails'])) {
    $sources = $renderer['thumbnail']['thumbnails'];
  } elseif (isset($renderer['thumbnails']) && is_array($renderer['thumbnails'])) {
    $sources = $renderer['thumbnails'];
  }
  if (count($sources) > 0) {
    $last = end($sources);
    if (isset($last['url']) && is_string($last['url'])) return $last['url'];
  }
  return $fallback;
}

function oasis_collect_results($node, &$results, &$seen, $maxResults) {
  if (!is_array($node) || count($results) >= $maxResults) return;

  if (isset($node['videoRenderer']) && is_array($node['videoRenderer'])) {
    $renderer = $node['videoRenderer'];
    $videoId = isset($renderer['videoId']) ? $renderer['videoId'] : '';
    $key = 'video:' . $videoId;
    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) && !isset($seen[$key])) {
      $seen[$key] = true;
      $results[] = [
        'id' => $videoId,
        'kind' => 'video',
        'title' => oasis_text(isset($renderer['title']) ? $renderer['title'] : [], 'Video de YouTube'),
        'author' => oasis_text(isset($renderer['ownerText']) ? $renderer['ownerText'] : (isset($renderer['shortBylineText']) ? $renderer['shortBylineText'] : []), 'YouTube'),
        'thumbnail' => oasis_thumbnail($renderer, "https://img.youtube.com/vi/$videoId/mqdefault.jpg"),
        'duration' => oasis_text(isset($renderer['lengthText']) ? $renderer['lengthText'] : [], '')
      ];
    }
  }

  if (isset($node['playlistRenderer']) && is_array($node['playlistRenderer'])) {
    $renderer = $node['playlistRenderer'];
    $playlistId = isset($renderer['playlistId']) ? $renderer['playlistId'] : '';
    $key = 'playlist:' . $playlistId;
    if ($playlistId !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $playlistId) && !isset($seen[$key])) {
      $seen[$key] = true;
      $results[] = [
        'id' => $playlistId,
        'kind' => 'playlist',
        'playlistId' => $playlistId,
        'title' => oasis_text(isset($renderer['title']) ? $renderer['title'] : [], 'Playlist de YouTube'),
        'author' => oasis_text(isset($renderer['shortBylineText']) ? $renderer['shortBylineText'] : [], 'YouTube'),
        'thumbnail' => oasis_thumbnail($renderer, ''),
        'videoCount' => intval(preg_replace('/\D+/', '', oasis_text(isset($renderer['videoCountText']) ? $renderer['videoCountText'] : [], '0')))
      ];
    }
  }

  if (isset($node['lockupViewModel']) && is_array($node['lockupViewModel'])) {
    $lockup = $node['lockupViewModel'];
    $contentId = isset($lockup['contentId']) ? $lockup['contentId'] : '';
    $contentType = isset($lockup['contentType']) ? $lockup['contentType'] : '';
    if ($contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST' && $contentId !== '') {
      $key = 'playlist:' . $contentId;
      if (!isset($seen[$key])) {
        $seen[$key] = true;
        $metadata = isset($lockup['metadata']['lockupMetadataViewModel']) ? $lockup['metadata']['lockupMetadataViewModel'] : [];
        $title = isset($metadata['title']['content']) ? $metadata['title']['content'] : 'Playlist de YouTube';
        $results[] = [
          'id' => $contentId,
          'kind' => 'playlist',
          'playlistId' => $contentId,
          'title' => $title,
          'author' => 'YouTube',
          'thumbnail' => ''
        ];
      }
    }
  }

  foreach ($node as $child) {
    if (is_array($child)) oasis_collect_results($child, $results, $seen, $maxResults);
    if (count($results) >= $maxResults) return;
  }
}

$url = 'https://www.youtube.com/results?search_query=' . rawurlencode($query) . '&hl=es&gl=US';
$html = oasis_fetch_url($url);
$results = [];
$seen = [];

if ($html !== '') {
  $patterns = [
    '/ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/',
    '/ytInitialData\s*=\s*({[\s\S]+?})\s*;<\/script>/'
  ];
  foreach ($patterns as $pattern) {
    if (preg_match($pattern, $html, $match)) {
      $data = json_decode($match[1], true);
      if (is_array($data)) oasis_collect_results($data, $results, $seen, $maxResults);
      if (count($results) > 0) break;
    }
  }
}

if (count($results) === 0 && $html !== '') {
  preg_match('/"INNERTUBE_API_KEY":"([^"]+)"/', $html, $apiMatch);
  preg_match('/"clientVersion":"([^"]+)"/', $html, $versionMatch);
  $apiKey = isset($apiMatch[1]) ? $apiMatch[1] : '';
  $clientVersion = isset($versionMatch[1]) ? $versionMatch[1] : '2.20260801.00.00';
  if ($apiKey !== '') {
    $payload = [
      'context' => [
        'client' => [
          'clientName' => 'WEB',
          'clientVersion' => $clientVersion,
          'hl' => 'es',
          'gl' => 'US'
        ]
      ],
      'query' => $query
    ];
    $json = oasis_post_json('https://www.youtube.com/youtubei/v1/search?key=' . rawurlencode($apiKey), $payload);
    if ($json !== '') {
      $data = json_decode($json, true);
      if (is_array($data)) oasis_collect_results($data, $results, $seen, $maxResults);
    }
  }
}

if (count($results) === 0) http_response_code(502);
echo json_encode([
  'query' => $query,
  'count' => count($results),
  'results' => $results,
  'error' => count($results) === 0 ? 'YouTube search returned no usable results' : null
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
