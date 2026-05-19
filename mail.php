<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Honeypot spam check
if (!empty($_POST['bot-field'])) {
    http_response_code(200);
    exit;
}

$first_name = strip_tags(trim($_POST['first_name'] ?? ''));
$last_name  = strip_tags(trim($_POST['last_name']  ?? ''));
$email      = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone      = strip_tags(trim($_POST['phone']   ?? ''));
$company    = strip_tags(trim($_POST['company'] ?? ''));
$service    = strip_tags(trim($_POST['service'] ?? ''));
$message    = strip_tags(trim($_POST['message'] ?? ''));

// Validate required fields
if (empty($first_name) || empty($last_name) || empty($message) || empty($service) ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please fill in all required fields.']);
    exit;
}

$to      = 'info@komtek.co.uk';
$subject = 'New enquiry from KomTek website — ' . $service;

$body  = "New enquiry from the KomTek website\n";
$body .= str_repeat('-', 40) . "\n\n";
$body .= "Name:    $first_name $last_name\n";
$body .= "Email:   $email\n";
$body .= "Phone:   " . ($phone    ?: 'Not provided') . "\n";
$body .= "Company: " . ($company  ?: 'Not provided') . "\n";
$body .= "Service: $service\n\n";
$body .= "Message:\n$message\n";

$headers  = "From: KomTek Website <info@komtek.co.uk>\r\n";
$headers .= "Reply-To: $first_name $last_name <$email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

if (mail($to, $subject, $body, $headers)) {
    http_response_code(200);
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Mail could not be sent. Please call us directly.']);
}
