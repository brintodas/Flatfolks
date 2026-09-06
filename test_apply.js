const form = new FormData();
form.append('student_id', '2');
form.append('move_in_date', '2026-09-01');
form.append('notes', 'test');
form.append('guarantor_name', 'Brinto');
form.append('guarantor_phone', '0111111111');
form.append('emergency_contact_name', 'Father');
form.append('emergency_contact_phone', '0111111111');
form.append('agreed_to_rules', 'true');

fetch('http://localhost:8000/api/listings/9/apply', {
  method: 'POST',
  body: form
}).then(res => res.text()).then(text => console.log(text)).catch(err => console.error(err));
