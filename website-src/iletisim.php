<?php
// iletişim formu — honeypot + e-posta yönlendirme
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $hp = trim($_POST['website'] ?? '');
  if ($hp !== '') { http_response_code(400); exit('spam'); }
  $name = trim($_POST['name'] ?? '');
  $email = trim($_POST['email'] ?? '');
  $msg = trim($_POST['message'] ?? '');
  if ($name === '' || $email === '' || $msg === '') { http_response_code(400); exit('eksik alan'); }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); exit('geçersiz e-posta'); }
  $to = 'iletisim@aethernodevpn.com';
  $subject = 'AetherNode Browser — iletişim: ' . $name;
  $body = "Ad: $name\nE-posta: $email\n\nMesaj:\n$msg\n";
  $headers = "From: noreply@aethernodevpn.com\r\nReply-To: $email\r\nContent-Type: text/plain; charset=utf-8";
  $ok = @mail($to, $subject, $body, $headers);
  if ($ok) { header('Location: /browser/?sent=1'); exit; }
  http_response_code(500); echo 'gönderilemedi';
  exit;
}
header('Location: /browser/');
