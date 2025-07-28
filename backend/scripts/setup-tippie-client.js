const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTippieClient() {
  try {
    // Check if Tippie client already exists
    const existingTippie = await prisma.client.findFirst({
      where: { 
        OR: [
          { email: 'elnur@tippie.de' },
          { company: 'Gratuity Systems International PTE. LTD.' }
        ]
      }
    });

    if (existingTippie) {
      console.log('Tippie client already exists, updating...');
      
      const updatedClient = await prisma.client.update({
        where: { id: existingTippie.id },
        data: {
          name: 'Gratuity Systems International PTE. LTD.',
          company: 'Gratuity Systems International PTE. LTD.',
          email: 'elnur@tippie.de',
          primaryContactName: 'Elnur',
          primaryContactEmail: 'elnur@tippie.de',
          ccEmails: ['christian@tippie.de'],
          address: '9 RAFFLES PLACE #26-01 REPUBLIC PLAZA',
          city: 'SINGAPORE',
          postalCode: '048619',
          country: 'Singapore',
          registrationNumber: '202137465K',
          preferredCurrency: 'EUR'
        }
      });

      console.log(`Updated Tippie client: ${updatedClient.name}`);
    } else {
      // Create Tippie client
      const tippieClient = await prisma.client.create({
        data: {
          name: 'Gratuity Systems International PTE. LTD.',
          company: 'Gratuity Systems International PTE. LTD.',
          email: 'elnur@tippie.de',
          primaryContactName: 'Elnur',
          primaryContactEmail: 'elnur@tippie.de',
          ccEmails: ['christian@tippie.de'],
          address: '9 RAFFLES PLACE #26-01 REPUBLIC PLAZA',
          city: 'SINGAPORE',
          postalCode: '048619',
          country: 'Singapore',
          registrationNumber: '202137465K',
          preferredCurrency: 'EUR'
        }
      });

      console.log(`Created Tippie client: ${tippieClient.name}`);
    }

    // Display client information
    const client = await prisma.client.findFirst({
      where: { email: 'elnur@tippie.de' }
    });

    if (client) {
      console.log('\\nTippie Client Information:');
      console.log(`- Name: ${client.name}`);
      console.log(`- Primary Contact: ${client.primaryContactName} (${client.primaryContactEmail})`);
      console.log(`- CC Emails: ${client.ccEmails.join(', ')}`);
      console.log(`- Address: ${client.address}, ${client.city} ${client.postalCode}, ${client.country}`);
      console.log(`- Registration: ${client.registrationNumber}`);
      console.log(`- Currency: ${client.preferredCurrency}`);
    }

  } catch (error) {
    console.error('Error setting up Tippie client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTippieClient();