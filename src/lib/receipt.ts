import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { DEFAULT_LOGO, DOCUMENT_LOGO } from './constants';

interface ReceiptData {
  receiptNo: string;
  studentName: string;
  studentCourse: string;
  amount: number;
  balance?: number;
  tuitionTotal?: number;
  totalPaid?: number;
  date: Date;
  method: string;
  category?: string;
  notes?: string;
  recordedBy?: string;
  logoUrl?: string;
}

const getProcessedLogoDataUrl = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(url);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample top-left pixel as potential background color
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const bgA = data[3];

        // Only use corner as reference if it's opaque and relatively light
        const useCornerRef = bgA > 200 && (bgR > 120 || bgG > 120 || bgB > 120);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          let isBackground = false;

          // 1. Check against sampled corner color (if corner is opaque)
          if (useCornerRef) {
            const distance = Math.sqrt(
              Math.pow(r - bgR, 2) + 
              Math.pow(g - bgG, 2) + 
              Math.pow(b - bgB, 2)
            );
            if (distance < 45) {
              isBackground = true;
            }
          }
          
          // 2. Alpha check (if it's already transparent, it's background)
          if (!isBackground && a < 50) {
            isBackground = true;
          }
          
          if (isBackground) {
            data[i + 3] = 0;
          } else {
            // FOR DOCUMENTS: Target any visible element (text/icons)
            // and force it to solid, opaque BLACK for clarity on white paper.
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        // Solid black color overlay for extra crispness and to catch anti-aliasing
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Error processing logo:", e);
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
  });
};

const getHeaderHtml = (logoUrl: string) => `
  <div style="text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #0A0F1C;">
    <img src="${logoUrl}" style="height: 180px; width: auto; max-width: 95%; object-fit: contain; margin: 12px auto 2px auto; display: block;" />
    <div style="font-size: 11px; color: #1a1a1a; line-height: 1.4; letter-spacing: 0.1px;">
      <p style="margin: 0; font-weight: 800; font-size: 13px; color: #000; text-transform: uppercase;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
      <p style="margin: 2px 0; font-weight: 600;">Email: charthessfashions@gmail.com</p>
      <p style="margin: 2px 0; font-weight: 600;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
    </div>
  </div>
`;

export const generateReceiptPDF = async (data: ReceiptData) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '780px';
  receiptContainer.style.padding = '20px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoPath = DOCUMENT_LOGO;
  const processedLogoUrl = await getProcessedLogoDataUrl(logoPath);

  const headerHtml = `
  <div style="text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #0A0F1C;">
    <img src="${processedLogoUrl}" style="height: 160px; width: auto; max-width: 95%; object-fit: contain; margin: 12px auto 2px auto; display: block;" />
    <div style="font-size: 10px; color: #1a1a1a; line-height: 1.3; letter-spacing: 0.1px;">
      <p style="margin: 0; font-weight: 800; font-size: 12px; color: #000; text-transform: uppercase;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
      <p style="margin: 2px 0; font-weight: 600;">Email: charthessfashions@gmail.com</p>
      <p style="margin: 2px 0; font-weight: 600;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
    </div>
  </div>
`;

  receiptContainer.innerHTML = `
    <div style="border: 3px solid #0A0F1C; padding: 20px; position: relative; overflow: hidden; min-height: 980px; display: flex; flex-direction: column; justify-content: space-between;">
      <img src="${processedLogoUrl}" style="position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%); width: 550px; opacity: 0.05; pointer-events: none;" />
      
      <div>
        ${headerHtml}

        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #1CA3B8; text-transform: uppercase; letter-spacing: 1px;">Official Receipt</h2>
            <p style="margin: 3px 0 0 0; font-weight: 900; font-size: 12px;">No: ${data.receiptNo}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #333; font-weight: 600;">Date: ${format(data.date, 'PPPP')}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px; line-height: 1.4;">
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 10px; align-items: end;">
            <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Received From:</div>
            <div style="font-size: 16px; font-weight: 900; border-bottom: 2px solid #eee; padding-bottom: 2px; color: #0A0F1C;">${data.studentName}</div>
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 10px; align-items: end;">
            <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Course:</div>
            <div style="font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 2px; font-weight: 700;">${data.studentCourse}</div>
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 10px; align-items: end;">
            <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">The Sum Of:</div>
            <div style="font-size: 24px; font-weight: 900; color: #0A0F1C; border-bottom: 2px solid #0A0F1C; padding-bottom: 2px;">GH₵ ${data.amount.toLocaleString()}.00</div>
          </div>
          <div style="margin: 15px 0; padding: 12px; background: #f8fafc; border: 2.5px solid #0A0F1C; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 900; color: #0A0F1C; text-transform: uppercase; font-size: 9px; letter-spacing: 1.2px; margin-bottom: 2px;">Outstanding Debt</div>
              <div style="font-weight: 900; font-size: 10px; color: #1CA3B8; text-transform: uppercase; letter-spacing: 0.5px;">Academic Balance</div>
            </div>
            <div style="font-size: 18px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</div>
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 10px; align-items: end;">
            <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Payment For:</div>
            <div style="font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 2px; text-transform: capitalize; font-weight: 700;">${data.category || 'Tuition Fee'} ${data.notes ? `- ${data.notes}` : ''}</div>
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 10px; align-items: end;">
            <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Mode:</div>
            <div style="font-size: 14px; text-transform: capitalize; font-weight: 700;">${data.method}</div>
          </div>
        </div>

        <div style="margin: 20px 0; padding: 15px; border: 1.5px solid #eee; border-radius: 10px; background: #fafafa;">
          <h3 style="margin: 0 0 10px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #1CA3B8; text-align: center;">Ledger Statement Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
            <div>
              <p style="margin: 0; font-size: 8px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">Total Fee</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900;">GH₵ ${(data.tuitionTotal || 0).toLocaleString()}.00</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 8px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">Total Paid</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #059669;">GH₵ ${(data.totalPaid || data.amount).toLocaleString()}.00</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 8px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">Balance</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</p>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #eee;">
        <div style="font-size: 10px; color: #666; font-weight: 600;">
          <p style="margin: 0;">This is a computer-generated receipt.</p>
          <p style="margin: 3px 0 0 0; color: #0A0F1C; font-weight: 800;">Generated by: ${data.recordedBy || 'Administrator'}</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 160px; border-bottom: 2px solid #0A0F1C; margin-bottom: 5px;"></div>
          <p style="margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Authorized Signature</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  const images = Array.from(receiptContainer.getElementsByTagName('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  try {
    const canvas = await html2canvas(receiptContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Fit to one page if possible, or scale down
    const pageHeight = pdf.internal.pageSize.getHeight();
    const scaleFactor = Math.min(1, pageHeight / pdfHeight);
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight * scaleFactor);
    
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    pdf.save(`Receipt_${data.receiptNo}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};

export const generateInvoicePDF = async (student: any, customLogoUrl?: string) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '30px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Inter', sans-serif";
  
  const logoPath = DOCUMENT_LOGO;
  const logoUrl = await getProcessedLogoDataUrl(logoPath);

  const headerHtml = getHeaderHtml(logoUrl);

  container.innerHTML = `
    <div style="border: 2px solid #eee; padding: 30px;">
      ${headerHtml}
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; margin-top: 10px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 28px; font-weight: 900; color: #0A0F1C; text-transform: uppercase;">Invoice</h2>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Date: ${format(new Date(), 'PP')}</p>
          <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 12px;">Inv No: INV-${student.id.substring(0, 6).toUpperCase()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
        <div>
          <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; color: #888; margin-bottom: 8px;">Billing To:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900;">${student.fullName}</p>
          <p style="margin: 4px 0; color: #666; font-size: 12px;">${student.phone}</p>
          <p style="margin: 0; color: #666; font-size: 12px;">${student.email || student.address || 'Student Record'}</p>
        </div>
        <div style="text-align: right;">
          <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; color: #888; margin-bottom: 8px;">Program Info:</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold;">${student.course}</p>
          <p style="margin: 4px 0; color: #666; font-size: 12px;">Batch: ${student.batch || 'Not Set'}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background: #0A0F1C; color: white;">
            <th style="padding: 10px 12px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Description</th>
            <th style="padding: 10px 12px; text-align: right; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Amount (GH₵)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px 12px;">
              <p style="margin: 0; font-weight: bold;">Academic Tuition Fee</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">Professional training and practical session fees.</p>
            </td>
            <td style="padding: 15px 12px; text-align: right; font-weight: bold;">${(student.tuitionTotal || 0).toLocaleString()}.00</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 12px;">Total Fees</span>
            <span style="font-weight: bold;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 12px;">Previously Paid</span>
            <span style="font-weight: bold; color: #059669;">- GH₵ ${(student.amountPaid || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f9f9f9; margin-top: 5px;">
            <span style="font-weight: 900; text-transform: uppercase; padding-left: 10px; font-size: 12px;">Balance Due</span>
            <span style="font-weight: 900; font-size: 18px; color: #e11d48; padding-right: 10px;">GH₵ ${(student.balance || 0).toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; border-top: 2px solid #0A0F1C; padding-top: 15px;">
        <p style="font-weight: 900; text-transform: uppercase; font-size: 11px; margin-bottom: 10px;">Payment Terms:</p>
        <p style="margin: 0; font-size: 11px; color: #444; line-height: 1.6;">
          1. Quote CH-${student.id.substring(0, 8).toUpperCase()} as reference.<br/>
          2. Fees paid are non-refundable after 14 days.<br/>
          3. Contact finance office for any payment plan adjustments.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const images = Array.from(container.getElementsByTagName('img'));
  await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => img.onload = img.onerror = resolve)));

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    pdf.save(`Invoice_${student.fullName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};

export interface EnrollmentData {
  student: any;
  schoolInfo?: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    logoUrl?: string;
  };
}

export const generateEnrollmentPDF = async (data: EnrollmentData) => {
  const logoPath = DOCUMENT_LOGO;
  const logoUrl = await getProcessedLogoDataUrl(logoPath);
  const student = data.student;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  const generatePage = async (contentHtml: string) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = "'Inter', sans-serif";
    container.innerHTML = contentHtml;
    document.body.appendChild(container);
    
    // Wait for images
    const imgs = Array.from(container.getElementsByTagName('img'));
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => img.onload = img.onerror = resolve)));
    
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    document.body.removeChild(container);
    return imgData;
  };

  // Page 1: Main Info
  const page1Html = `
    <div style="border: 4px solid #000; padding: 30px; min-height: 1050px;">
      ${getHeaderHtml(logoUrl)}
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <div style="text-align: right;">
          <div style="background: #0A0F1C; color: white; padding: 8px 15px; font-weight: 900; text-transform: uppercase; font-size: 16px; margin-bottom: 8px;">Official Enrollment Document</div>
          <p style="margin: 0; font-weight: bold; font-size: 13px;">Admission No: CH-${student.id ? student.id.substring(0, 8).toUpperCase() : 'NEW'}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px;">Dated: ${format(new Date(student.enrollmentDate || Date.now()), 'PPPP')}</p>
        </div>
      </div>

      <div style="display: flex; gap: 30px; margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0;">
        <div style="width: 140px; height: 140px; background: #eee; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${student.photoUrl ? `<img src="${student.photoUrl}" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="font-size: 9px; color: #999; text-transform: uppercase; text-align: center;">Official Photograph</div>'}
        </div>
        <div style="flex: 1;">
          <div style="border-bottom: 3px solid #0A0F1C; padding-bottom: 6px; margin-bottom: 12px;">
            <p style="margin: 0; font-size: 11px; color: #1CA3B8; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Scholar Identity</p>
            <h2 style="margin: 4px 0 0 0; font-size: 26px; font-weight: 900; text-transform: uppercase; color: #0A0F1C;">${student.surname}, ${student.firstName} ${student.otherNames || ''}</h2>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Academic Program</p>
              <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: 800; color: #0f172a;">${student.course}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Intake Batch</p>
              <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: 800; color: #0f172a;">${student.batch || 'Pending'}</p>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
        <div style="margin-bottom: 20px;">
          <h3 style="border-left: 5px solid #1CA3B8; padding: 4px 10px; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; background: #f0fdfa;">Personal Data</h3>
          <div style="font-size: 12px; line-height: 1.6;">
            <p><strong>DOB:</strong> ${student.dob} (${student.age} yrs)</p>
            <p><strong>Gender / Status:</strong> ${student.gender} / ${student.maritalStatus}</p>
            <p><strong>Nationality:</strong> ${student.nationality}</p>
            <p><strong>Address:</strong> ${student.address}</p>
            <p><strong>Contact:</strong> ${student.phone}</p>
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3 style="border-left: 5px solid #0A0F1C; padding: 4px 10px; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; background: #f8fafc;">Guardian Info</h3>
          <div style="font-size: 12px; line-height: 1.6;">
            <p><strong>Name:</strong> ${student.guardianName}</p>
            <p><strong>Contact:</strong> ${student.guardianPhone}</p>
            <p><strong>Secondary:</strong> ${student.secondaryGuardianName || 'None'}</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 10px;">
        <h3 style="border-left: 5px solid #1CA3B8; padding: 4px 10px; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; background: #f0fdfa;">Academic Background</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px;">
          <p><strong>Last School:</strong> ${student.lastSchool}</p>
          <p><strong>Qualification:</strong> ${student.qualifications || 'N/A'}</p>
          <p><strong>Completion:</strong> ${student.yearCompleted}</p>
        </div>
      </div>

      <div style="margin-top: 20px; padding: 20px; background: #0A0F1C; color: white; border-radius: 15px;">
        <h4 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; font-weight: 900; color: #1CA3B8;">Financial Commitment</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px;">
          <div>
            <p style="margin: 4px 0; opacity: 0.8;">Total Tuition: GH₵ ${(student.tuitionTotal || 0).toLocaleString()}</p>
            <p style="margin: 4px 0; color: #059669; font-weight: bold;">Amount Paid: GH₵ ${(student.amountPaid || 0).toLocaleString()}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase;">Outstanding Balance</p>
            <p style="margin: 4px 0; font-size: 20px; font-weight: 900; color: #e11d48;">GH₵ ${(student.balance || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 15px; font-size: 11px; color: #333; text-transform: uppercase; letter-spacing: 3px; font-weight: 900;">
        Page 1/1 - Excellence In Training
      </div>
    </div>
  `;

  const img1 = await generatePage(page1Html);
  pdf.addImage(img1, 'PNG', 0, 0, pageWidth, (800 / pageWidth) * 1050); // Approximated ratio

  pdf.autoPrint();
  const blobUrl = pdf.output('bloburl');
  window.open(blobUrl, '_blank');
  pdf.save(`Enrollment_Form_${student.fullName.replace(/ /g, '_')}.pdf`);
};

export const generateBlankAdmissionFormPDF = async (customLogoUrl?: string) => {
  const logoPath = DOCUMENT_LOGO;
  const logoUrl = await getProcessedLogoDataUrl(logoPath);
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  const generatePage = async (contentHtml: string) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = "'Inter', sans-serif";
    container.innerHTML = contentHtml;
    document.body.appendChild(container);
    
    // Wait for images
    const imgs = Array.from(container.getElementsByTagName('img'));
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => img.onload = img.onerror = resolve)));
    
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    document.body.removeChild(container);
    return imgData;
  };

  const fieldRow = (label: string) => `
    <div style="margin-bottom: 18px; display: flex; align-items: end; gap: 12px;">
      <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #000; width: 160px; flex-shrink: 0;">${label}:</span>
      <div style="flex-grow: 1; border-bottom: 2px solid #333; height: 22px;"></div>
    </div>
  `;

  // Explicit Page 1
  const page1Html = `
    <div style="border: 4px solid #000; padding: 40px; min-height: 1131px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
      <div>
        ${getHeaderHtml(logoUrl)}
        
        <div style="text-align: center; margin: 10px 0 25px 0;">
          <h2 style="margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; text-decoration: underline; letter-spacing: 2px;">ADMISSION FORM</h2>
        </div>

        <div style="display: flex; gap: 30px; margin-bottom: 25px;">
           <div style="width: 140px; height: 170px; border: 3px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #555; text-transform: uppercase; text-align: center; background: #fafafa; font-weight: 800; padding: 10px;">
              Passport<br/>Photo
           </div>
           <div style="flex: 1;">
              ${fieldRow('Surname')}
              ${fieldRow('First Name')}
              ${fieldRow('Other Names')}
              ${fieldRow('Program')}
           </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
           <div>
              <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 6px; text-transform: uppercase;">A. PERSONAL DATA</h3>
              ${fieldRow('DOB')}
              ${fieldRow('Gender')}
              ${fieldRow('Nationality')}
              ${fieldRow('Marital Status')}
              ${fieldRow('Residential Addr')}
              ${fieldRow('Contact No')}
              ${fieldRow('WhatsApp No')}
              ${fieldRow('Email Address')}
           </div>
           <div>
              <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 6px; text-transform: uppercase;">B. GUARDIAN</h3>
              ${fieldRow('Name')}
              ${fieldRow('Relationship')}
              ${fieldRow('Occupation')}
              ${fieldRow('Phone 1')}
              ${fieldRow('Address')}
              <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-top: 25px; margin-bottom: 15px; padding-bottom: 6px; text-transform: uppercase;">C. EDUCATION</h3>
              ${fieldRow('Last School')}
              ${fieldRow('Qualification')}
              ${fieldRow('Year Completed')}
           </div>
        </div>
      </div>

      <div>
        <div style="margin-top: 20px; border: 2px solid #000; padding: 20px; border-radius: 8px;">
           <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 900; text-transform: uppercase;">D. DECLARATION</h3>
           <p style="margin: 0; font-size: 12px; line-height: 1.6; text-align: justify; font-style: italic;">
              I certify that the information provided is accurate. I agree to abide by the institutional guidelines and financial obligations of Charthess School of Fashion.
           </p>
           <div style="margin-top: 30px; display: flex; justify-content: space-between; gap: 30px;">
              <div style="flex: 1; border-top: 2px solid #000; text-align: center; font-size: 11px; font-weight: 800; padding-top: 5px;">SIGNATURE</div>
              <div style="width: 150px; border-top: 2px solid #000; text-align: center; font-size: 11px; font-weight: 800; padding-top: 5px;">DATE</div>
           </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; border-top: 1px solid #ddd; padding-top: 15px;">
           EXCELLENCE IN RESEARCH AND TRAINING
        </div>
      </div>
    </div>
  `;

  const imgData = await generatePage(page1Html);
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, 297); // 297 is A4 height in mm

  pdf.autoPrint();
  const blobUrl = pdf.output('bloburl');
  window.open(blobUrl, '_blank');
  pdf.save(`Admission_Form_Blank.pdf`);
};
