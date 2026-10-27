import crypto from 'node:crypto';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the staff password: ', (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  // Generate a 64-byte key using scrypt
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  
  console.log(`\n\nYour password hash is:\nscrypt$${salt}$${hash}\n`);
  rl.close();
});

//Staff password - staff123
//scrypt$e52ffc3991a6fd278ac1032b4f2cbd6a$54cc4b6764607c4655f630f0da11bf2aaff3a29b86fd6a43ae50b9e102df1c46d660b4d4aab394ef9bf6dc579019dad5c3c5a9b54655b73c536e537259186630