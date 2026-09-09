<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, array $data): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
$config = require __DIR__ . '/config.php';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) { header('Allow: GET, POST'); respond(405, ['message'=>'Метод не поддерживается.']); }
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 16000) respond(413, ['message'=>'Заявка слишком большая.']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$fetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
if ($fetchSite === 'cross-site' || ($origin !== '' && $config['origin'] !== '' && $origin !== $config['origin'])) respond(403, ['message'=>'Отправьте заявку с сайта.']);
session_name('sitnikov_session');
session_start(['cookie_httponly'=>true,'cookie_secure'=>(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),'cookie_samesite'=>'Strict','cookie_lifetime'=>0,'use_strict_mode'=>true]);
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$autoload = dirname(__DIR__) . '/vendor/autoload.php';
$configured = is_file($autoload) && $config['host'] !== '' && $config['username'] !== '' && $config['password'] !== '' && filter_var($config['from'], FILTER_VALIDATE_EMAIL) && $config['origin'] !== '' && strlen($config['rate_secret']) >= 32;
if ($method === 'GET') respond(200, ['token'=>$_SESSION['csrf'], 'configured'=>(bool)$configured]);
if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) respond(415, ['message'=>'Ожидается JSON.']);
if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) respond(403, ['message'=>'Сессия формы устарела. Повторите отправку.']);
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) respond(400, ['message'=>'Некорректная заявка.']);
foreach (['name'=>80,'phone'=>30,'comment'=>2000,'source'=>200,'website'=>200,'consentVersion'=>30] as $key=>$limit) {
    if (isset($data[$key]) && !is_string($data[$key])) respond(422, ['message'=>'Некорректный формат полей.']);
    if (preg_match_all('/./us', $data[$key] ?? '', $unused) > $limit) respond(422, ['message'=>'Проверьте длину полей заявки.']);
}
if (($data['website'] ?? '') !== '') respond(422, ['message'=>'Не удалось принять заявку. Свяжитесь напрямую.']);
if (($data['consent'] ?? false) !== true || ($data['consentVersion'] ?? '') !== $config['consent_version']) respond(422, ['message'=>'Подтвердите актуальное согласие на обработку персональных данных.']);
$phone = preg_replace('/\D/', '', $data['phone'] ?? '');
if (!preg_match('/^7\d{10}$/', $phone)) respond(422, ['message'=>'Проверьте номер телефона.']);
$name = trim($data['name'] ?? '');
$comment = trim($data['comment'] ?? '');
$source = trim($data['source'] ?? 'Сайт');
if (preg_match('/[\r\n\x00]/', $name . $source)) respond(422, ['message'=>'Проверьте имя и источник обращения.']);
// Blocking repeated attempts inside one browser also works before SMTP configuration.
if (time() - (int)($_SESSION['last_attempt'] ?? 0) < 30) respond(429, ['message'=>'Подождите 30 секунд перед повторной отправкой.']);
$_SESSION['last_attempt'] = time();
if (!$configured) respond(503, ['message'=>'Отправка ещё не настроена. Позвоните +7 (906) 750-06-00 или напишите smv001@yandex.ru.']);
// Atomic server-side rate limit independent of session; contains no raw IP or form data.
$rateDir = sys_get_temp_dir() . '/sitnikov-rate-' . substr(hash('sha256', __DIR__),0,12);
if (!is_dir($rateDir) && !mkdir($rateDir,0700,true) && !is_dir($rateDir)) respond(503, ['message'=>'Сервис временно недоступен.']);
foreach (glob($rateDir . '/*.json') ?: [] as $old) if (filemtime($old) < time()-3600) @unlink($old);
$key = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $config['rate_secret']);
$handle = fopen($rateDir . '/' . $key . '.json', 'c+');
if (!$handle || !flock($handle,LOCK_EX)) respond(503, ['message'=>'Попробуйте отправить позже.']);
$attempts = json_decode(stream_get_contents($handle),true) ?: [];
$attempts = array_values(array_filter($attempts, fn($time)=>is_int($time) && $time>time()-3600));
if (count($attempts)>=5 || ($attempts && time()-end($attempts)<30)) {flock($handle,LOCK_UN);fclose($handle);respond(429, ['message'=>'Слишком частые заявки. Попробуйте позже или позвоните.']);}
$attempts[]=time();ftruncate($handle,0);rewind($handle);fwrite($handle,json_encode($attempts));flock($handle,LOCK_UN);fclose($handle);
$calculation='';
if (isset($data['calculation'])) {
    $c=$data['calculation'];
    if (!is_array($c)) respond(422, ['message'=>'Некорректные параметры расчёта.']);
    $taxes=['income'=>'УСН — доходы','expense'=>'УСН — доходы минус расходы','general'=>'ОСНО','automated'=>'АУСН'];
    if (!in_array($c['business']??'', ['ip','ooo'],true) || !is_string($c['tax']??null) || !array_key_exists($c['tax'], $taxes)) respond(422,['message'=>'Проверьте параметры калькулятора.']);
    foreach (['employees'=>1000,'turnover'=>1000000000000] as $field=>$max) if (!isset($c[$field]) || !is_int($c[$field]) || $c[$field]<0 || $c[$field]>$max) respond(422,['message'=>'Проверьте число сотрудников и месячный оборот.']);
    $activityNames=['service'=>'Услуги / IT','trade'=>'Торговля','production'=>'Производство / стройка','restaurant'=>'Общепит'];
    if (!is_array($c['activities']??null) || count($c['activities'])>4) respond(422,['message'=>'Проверьте виды деятельности.']);
    foreach($c['activities'] as $activity) if(!is_string($activity)||!isset($activityNames[$activity]))respond(422,['message'=>'Проверьте виды деятельности.']);
    $planNames=['zero'=>'Нулевая отчётность','startup'=>'Стартап','lite'=>'Лайт','smart'=>'Смарт','plus'=>'Плюс','free'=>'Свободный','optim'=>'АУСН Оптимальный','complex'=>'АУСН Комплексный','ups'=>'Индивидуальный расчёт','upsTrade'=>'Индивидуальный расчёт'];
    if(!is_string($c['plan']??null)||!isset($planNames[$c['plan']]))respond(422,['message'=>'Проверьте выбранный тариф.']);
    // Frontend price is only a visitor's preliminary estimate, never a confirmed quote.
    $calculation="\nПараметры калькулятора:\nТариф: ".$planNames[$c['plan']]."\nФорма: ".($c['business']==='ip'?'ИП':'ООО')."\nРежим: ".$taxes[$c['tax']]."\nСотрудники: ".$c['employees']."\nОборот в месяц: ".$c['turnover']." ₽\nДеятельность: ".implode(', ',array_map(fn($key)=>$activityNames[$key],$c['activities']));
    if (isset($c['estimate']) && is_numeric($c['estimate'])) $calculation.="\nОриентир из браузера (не подтверждённая цена): ".max(0,min(1000000000000,(int)$c['estimate']))." ₽";
}
require $autoload;
try {
    $mail=new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();$mail->Host=$config['host'];$mail->SMTPAuth=true;
    $mail->Username=$config['username'];$mail->Password=$config['password'];
    $mail->SMTPSecure=$config['encryption']==='ssl'?PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port=$config['port'];$mail->Timeout=12;$mail->SMTPDebug=0;$mail->CharSet='UTF-8';
    $mail->setFrom($config['from'],'Сайт бухгалтерских услуг');
    $mail->addAddress($config['recipient']);$mail->Subject='Заявка с сайта бухгалтерских услуг';
    $mail->Body="Имя: $name\nТелефон: +$phone\nКомментарий: $comment\nИсточник: $source$calculation\n\nСогласие: подтверждено\nВерсия: ".$config['consent_version']."\nВремя подтверждения (сервер, UTC): ".gmdate('c');
    $mail->send();respond(200,['ok'=>true]);
} catch (Throwable $error) {
    // Do not log credentials, personal data, or SMTP conversation.
    error_log('Sitnikov contact: SMTP delivery failed.');
    respond(502,['message'=>'Письмо не удалось отправить. Данные остались в форме. Попробуйте позже или свяжитесь напрямую.']);
}
