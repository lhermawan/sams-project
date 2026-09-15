const fs = require('fs');
const file = 'app/[tenantDomain]/(employee)/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'await signOut({ redirectTo: ${protocol}://${host}/login });',
  'await signOut({ redirectTo: `${protocol}://${host}/login` });'
);
fs.writeFileSync(file, content);
console.log('Fixed profile page!');
