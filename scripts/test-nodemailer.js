import nodemailer from 'nodemailer';

console.log('nodemailer.createTransport type:', typeof nodemailer.createTransport);
if (typeof nodemailer.createTransport === 'function') {
  console.log('createTransport is available — nodemailer should work.');
} else {
  console.error('createTransport is NOT available — nodemailer may be incompatible.');
}

