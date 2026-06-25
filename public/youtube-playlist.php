<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

$playlistId = isset($_GET['playlistId']) ? preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['playlistId']) : '';
$maxVideos = isset($_GET['max']) ? max(1, min(300, intval($_GET['max']))) : 300;

if ($playlistId === '') {
  http_response_code(400);
  echo json_encode(['videos' => [], 'error' => 'playlistId required']);
  exit;
}

function fetch_url($url) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_TIMEOUT => 18,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      CURLOPT_HTTPHEADER => ['Accept-Language: es,en;q=0.8']
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
      'header' => "User-Agent: Mozilla/5.0\r\nAccept-Language: es,en;q=0.8\r\n"
    ]
  ]);
  $body = @file_get_contents($url, false, $context);
  return is_string($body) ? $body : '';
}

function decode_text($value) {
  return trim(html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_XML1, 'UTF-8'));
}

function collect_playlist_videos($node, &$videos, &$seen, $maxVideos) {
  if (count($videos) >= $maxVideos || !is_array($node)) return;

  if (isset($node['lockupViewModel']) && is_array($node['lockupViewModel'])) {
    $lockup = $node['lockupViewModel'];
    $videoId = isset($lockup['contentId']) ? $lockup['contentId'] : '';
    $contentType = isset($lockup['contentType']) ? $lockup['contentType'] : '';
    if ($contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) && !isset($seen[$videoId])) {
      $seen[$videoId] = true;
      $title = isset($lockup['metadata']['lockupMetadataViewModel']['title']['content'])
        ? $lockup['metadata']['lockupMetadataViewModel']['title']['content']
        : 'Video de YouTube';
      $author = 'YouTube';
      if (isset($lockup['metadata']['lockupMetadataViewModel']['metadata']['contentMetadataViewModel']['metadataRows'][0]['metadataParts'][0]['text']['content'])) {
        $author = $lockup['metadata']['lockupMetadataViewModel']['metadata']['contentMetadataViewModel']['metadataRows'][0]['metadataParts'][0]['text']['content'];
      }
      $thumb = "https://img.youtube.com/vi/$videoId/mqdefault.jpg";
      if (isset($lockup['contentImage']['thumbnailViewModel']['image']['sources'])) {
        $sources = $lockup['contentImage']['thumbnailViewModel']['image']['sources'];
        $lastThumb = end($sources);
        if (isset($lastThumb['url'])) $thumb = $lastThumb['url'];
      }
      $videos[] = [
        'id' => $videoId,
        'title' => $title,
        'author' => $author,
        'thumbnail' => $thumb,
        'index' => count($videos) + 1
      ];
    }
  }

  if (isset($node['playlistVideoRenderer']) && is_array($node['playlistVideoRenderer'])) {
    $renderer = $node['playlistVideoRenderer'];
    $videoId = isset($renderer['videoId']) ? $renderer['videoId'] : '';
    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) && !isset($seen[$videoId])) {
      $seen[$videoId] = true;
      $title = 'Video de YouTube';
      if (isset($renderer['title']['runs'][0]['text'])) {
        $title = $renderer['title']['runs'][0]['text'];
      } elseif (isset($renderer['title']['simpleText'])) {
        $title = $renderer['title']['simpleText'];
      }
      $author = isset($renderer['shortBylineText']['runs'][0]['text']) ? $renderer['shortBylineText']['runs'][0]['text'] : 'YouTube';
      $duration = isset($renderer['lengthText']['simpleText']) ? $renderer['lengthText']['simpleText'] : null;
      $thumb = "https://img.youtube.com/vi/$videoId/mqdefault.jpg";
      if (isset($renderer['thumbnail']['thumbnails']) && is_array($renderer['thumbnail']['thumbnails'])) {
        $lastThumb = end($renderer['thumbnail']['thumbnails']);
        if (isset($lastThumb['url'])) $thumb = $lastThumb['url'];
      }
      $videos[] = [
        'id' => $videoId,
        'title' => $title,
        'author' => $author,
        'thumbnail' => $thumb,
        'duration' => $duration,
        'index' => count($videos) + 1
      ];
    }
  }

  foreach ($node as $child) {
    if (is_array($child)) collect_playlist_videos($child, $videos, $seen, $maxVideos);
    if (count($videos) >= $maxVideos) return;
  }
}

function find_continuation_token($node) {
  if (!is_array($node)) return null;

  if (isset($node['continuationCommand']['token'])) {
    return $node['continuationCommand']['token'];
  }

  if (isset($node['nextContinuationData']['continuation'])) {
    return $node['nextContinuationData']['continuation'];
  }

  if (isset($node['continuationItemRenderer']['continuationEndpoint']['continuationCommand']['token'])) {
    return $node['continuationItemRenderer']['continuationEndpoint']['continuationCommand']['token'];
  }

  foreach ($node as $child) {
    if (is_array($child)) {
      $found = find_continuation_token($child);
      if ($found !== null) return $found;
    }
  }

  return null;
}

function post_json($url, $payload) {
  $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_TIMEOUT => 18,
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $body,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
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

function expand_playlist_continuations($initialData, $html, &$videos, &$seen, $maxVideos) {
  if (!is_array($initialData) || count($videos) >= $maxVideos) return;

  preg_match('/"INNERTUBE_API_KEY":"([^"]+)"/', $html, $apiMatch);
  preg_match('/"clientVersion":"([^"]+)"/', $html, $versionMatch);

  $apiKey = isset($apiMatch[1]) ? $apiMatch[1] : '';
  $clientVersion = isset($versionMatch[1]) ? $versionMatch[1] : '2.20240601.00.00';
  if ($apiKey === '') return;

  $continuation = find_continuation_token($initialData);
  $seenTokens = [];

  for ($page = 0; $page < 12 && $continuation && count($videos) < $maxVideos; $page++) {
    if (isset($seenTokens[$continuation])) break;
    $seenTokens[$continuation] = true;

    $payload = [
      'context' => [
        'client' => [
          'clientName' => 'WEB',
          'clientVersion' => $clientVersion,
          'hl' => 'es',
          'gl' => 'US'
        ]
      ],
      'continuation' => $continuation
    ];

    $json = post_json('https://www.youtube.com/youtubei/v1/browse?key=' . rawurlencode($apiKey), $payload);
    if ($json === '') break;

    $data = json_decode($json, true);
    if (!is_array($data)) break;

    $before = count($videos);
    collect_playlist_videos($data, $videos, $seen, $maxVideos);
    $continuation = find_continuation_token($data);
    if (count($videos) === $before && !$continuation) break;
  }
}

function fetch_playlist_browse($playlistId, $html, $maxVideos) {
  preg_match('/"INNERTUBE_API_KEY":"([^"]+)"/', $html, $apiMatch);
  preg_match('/"clientVersion":"([^"]+)"/', $html, $versionMatch);

  $apiKey = isset($apiMatch[1]) ? $apiMatch[1] : '';
  $clientVersion = isset($versionMatch[1]) ? $versionMatch[1] : '2.20240601.00.00';
  if ($apiKey === '') return [];

  $payload = [
    'context' => [
      'client' => [
        'clientName' => 'WEB',
        'clientVersion' => $clientVersion,
        'hl' => 'es',
        'gl' => 'US'
      ]
    ],
    'browseId' => 'VL' . $playlistId
  ];

  $json = post_json('https://www.youtube.com/youtubei/v1/browse?key=' . rawurlencode($apiKey), $payload);
  if ($json === '') return [];

  $data = json_decode($json, true);
  if (!is_array($data)) return [];

  $videos = [];
  $seen = [];
  collect_playlist_videos($data, $videos, $seen, $maxVideos);
  expand_playlist_continuations($data, $html, $videos, $seen, $maxVideos);
  return $videos;
}

function parse_playlist_html($html, $maxVideos) {
  if (!preg_match('/ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/', $html, $match)
      && !preg_match('/ytInitialData\s*=\s*({[\s\S]+?})\s*;<\/script>/', $html, $match)) {
    return [];
  }

  $data = json_decode($match[1], true);
  if (!is_array($data)) return [];
  $videos = [];
  $seen = [];
  collect_playlist_videos($data, $videos, $seen, $maxVideos);
  expand_playlist_continuations($data, $html, $videos, $seen, $maxVideos);
  return $videos;
}

function parse_playlist_feed($xml, $maxVideos) {
  $videos = [];
  if ($xml === '') return $videos;
  if (!preg_match_all('/<entry>([\s\S]*?)<\/entry>/', $xml, $entries)) return $videos;

  foreach ($entries[1] as $entry) {
    if (count($videos) >= $maxVideos) break;
    if (!preg_match('/<yt:videoId>([\s\S]*?)<\/yt:videoId>/', $entry, $idMatch)) continue;
    $videoId = decode_text($idMatch[1]);
    if (!preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)) continue;
    preg_match('/<title>([\s\S]*?)<\/title>/', $entry, $titleMatch);
    preg_match('/<name>([\s\S]*?)<\/name>/', $entry, $authorMatch);
    $videos[] = [
      'id' => $videoId,
      'title' => isset($titleMatch[1]) ? decode_text($titleMatch[1]) : 'Video de YouTube',
      'author' => isset($authorMatch[1]) ? decode_text($authorMatch[1]) : 'YouTube',
      'thumbnail' => "https://img.youtube.com/vi/$videoId/mqdefault.jpg",
      'index' => count($videos) + 1
    ];
  }
  return $videos;
}

$html = fetch_url('https://www.youtube.com/playlist?list=' . rawurlencode($playlistId));
$videos = fetch_playlist_browse($playlistId, $html, $maxVideos);

if (count($videos) === 0) {
  $videos = parse_playlist_html($html, $maxVideos);
}

if (count($videos) === 0) {
  $xml = fetch_url('https://www.youtube.com/feeds/videos.xml?playlist_id=' . rawurlencode($playlistId));
  $videos = parse_playlist_feed($xml, $maxVideos);
}

echo json_encode([
  'playlistId' => $playlistId,
  'count' => count($videos),
  'videos' => $videos
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
