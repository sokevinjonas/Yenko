<!doctype html>
<html lang="en">
<body style="margin:0;background:#FFF9F0;font-family:Arial,Helvetica,sans-serif;color:#1F1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0B6E4F;padding:24px;color:#FFF9F0;font-size:28px;font-weight:800">yenko<span style="color:#F5A623">!</span></td></tr>
<tr><td style="height:8px;background:#F5A623"></td></tr>
<tr><td style="padding:28px 24px">
<p style="margin:0 0 12px;font-size:16px">Hi {{ $name }},</p>
<p style="margin:0 0 20px;font-size:16px">
@if($isReset)
Use this code to reset your Yenko password:
@else
Use this code to verify your student account:
@endif
</p>
<p style="margin:0 0 20px;font-size:36px;font-weight:800;letter-spacing:8px;text-align:center;background:#FDEBC8;border-radius:14px;padding:16px">{{ $code }}</p>
<p style="margin:0 0 8px;font-size:14px;color:#5C4F46">The code expires in {{ $minutes }} minutes.</p>
<p style="margin:0;font-size:14px;color:#5C4F46">If you didn't ask for it, you can ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
