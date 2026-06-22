<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$ticket_number = strip_tags(trim($_POST['ticket_number'] ?? ''));
$company_name  = strip_tags(trim($_POST['company_name'] ?? ''));
$contact_name  = strip_tags(trim($_POST['contact_name'] ?? ''));
$email         = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone         = strip_tags(trim($_POST['phone'] ?? ''));
$category      = strip_tags(trim($_POST['category'] ?? ''));
$subject       = strip_tags(trim($_POST['subject'] ?? ''));
$description   = strip_tags(trim($_POST['description'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || empty($ticket_number) || empty($subject)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data.']);
    exit;
}

// ── Admin notification ─────────────────────────────────────
$admin_subject = '[Support Ticket] ' . $ticket_number . ' — ' . $subject;

$admin_body  = "New support ticket received\n";
$admin_body .= str_repeat('-', 44) . "\n\n";
$admin_body .= "Ticket Number : $ticket_number\n";
$admin_body .= "Company       : $company_name\n";
$admin_body .= "Contact       : $contact_name\n";
$admin_body .= "Email         : $email\n";
$admin_body .= "Phone         : " . ($phone ?: 'Not provided') . "\n";
$admin_body .= "Category      : $category\n";
$admin_body .= "Subject       : $subject\n\n";
$admin_body .= "Description:\n$description\n\n";
$admin_body .= str_repeat('-', 44) . "\n";
$admin_body .= "Reply to this email to respond directly to the customer.\n";

$admin_headers  = "From: KomTek Support <support@komtek.co.uk>\r\n";
$admin_headers .= "Reply-To: $contact_name <$email>\r\n";
$admin_headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$admin_headers .= "X-Mailer: PHP/" . phpversion();

$admin_sent  = mail('support@komtek.co.uk', $admin_subject, $admin_body, $admin_headers);
$admin_sent2 = mail('kamran@komtek.co.uk',  $admin_subject, $admin_body, $admin_headers);

// ── Customer confirmation ──────────────────────────────────
$confirm_subject = 'Your KomTek Support Ticket — ' . $ticket_number;

$confirm_body  = "Dear $contact_name,\n\n";
$confirm_body .= "Thank you for contacting KomTek. Your support request has been received ";
$confirm_body .= "and a member of our team will be in touch shortly.\n\n";
$confirm_body .= "YOUR TICKET DETAILS\n";
$confirm_body .= str_repeat('-', 30) . "\n";
$confirm_body .= "Ticket Number : $ticket_number\n";
$confirm_body .= "Category      : $category\n";
$confirm_body .= "Subject       : $subject\n\n";
$confirm_body .= "We typically respond within 2 business hours (Mon–Fri, 9am–5:30pm).\n\n";
$confirm_body .= "You can track your ticket at any time:\n";
$confirm_body .= "https://www.komtek.co.uk/my-ticket.html\n\n";
$confirm_body .= "For urgent issues, please call us on 0333 305 6676.\n\n";
$confirm_body .= "Kind regards,\n";
$confirm_body .= "KomTek Support Team\n";
$confirm_body .= "support@komtek.co.uk | 0333 305 6676\n";
$confirm_body .= "8B Accommodation Road, Golders Green, London NW11 8ED\n";

$confirm_headers  = "From: KomTek Support <support@komtek.co.uk>\r\n";
$confirm_headers .= "Reply-To: KomTek Support <support@komtek.co.uk>\r\n";
$confirm_headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$confirm_headers .= "X-Mailer: PHP/" . phpversion();

$confirm_sent = mail($email, $confirm_subject, $confirm_body, $confirm_headers);

header('Content-Type: application/json');
echo json_encode([
    'admin_sent'   => $admin_sent && $admin_sent2,
    'confirm_sent' => $confirm_sent,
]);
