import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

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
  notes?: string;
  recordedBy?: string;
}

export const generateReceiptPDF = async (data: ReceiptData) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '800px';
  receiptContainer.style.padding = '40px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  // Robust SVG Data URI for the logo (Fashion silhouette leaning on 'C')
  const logoUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDApIj4KICAgIDxwYXRoIGQ9Ik0zNSAxNUMzNSAxNy43NjE0IDMyLjc2MTQgMjAgMzAgMjBDMjcuMjM4NiAyMCAyNSAxNy43NjE0IDI1IDE1QzI1IDEyLjIzODYgMjcuMjM4NiAxMCAzMCAxMEMzMi43NjE0IDEwIDM1IDEyLjIzODYgMzUgMTVaIiBmaWxsPSIjMEEwRjFDIi8+CiAgICA8cGF0aCBkPSJNMzAgMjBDMjcuODkzMyAyMC4wMDYxIDI1LjI5MzYgMTkuODQ3OCAyMy40NzgxIEwxNi4zMDYxIDEzLjgwMDhMMTQuOTI3NSAxNy42MjExTDE4LjczNDEgMjUuOTQyOEwxNi4zMDYxIDI2LjU5OTFMMTMuNjc0NyAxOC43MTQ5TDExLjcwNzYgMjQuMTY1Mkw4LjI5MTkzIDIyLjkzOTlMMTMuMTUxIDEzLjM1OTZMMTguMjA4MyAxMC42Nzg5TDI0LjI3NTYgMTQuOTI3NSAyNy44OTMzIDE4LjY3MTdMMzIuMzA2MSAyNS44MDBMMzIuMzA2MSAzMC4zMDRMMzQuOTM3NSA0MC4zMDRMMzQuOTM3NSA0NS4zMDRMMzcuNjQ0IDQ5LjIzNkw0MC4yNzU0IDQ4LjQ5NDRMNDAuMjA5NiA0MC4zMDRMMzcuNjc2OCAzMC40Njg4TDM3LjY3NjggMjUuOTQyOEwzMCAyMFoiIGZpbGw9IiMwQTBGMUMiLz4KICAgIDxwYXRoIGQ9Ik0yMC44NTcyIDQzLjg4NzhMMjAuODU3MiA0MC4xMjY1QzE3Ljg5NjkgNDAuNDYyMiAxNi4yNDQ2IDM4LjQ2NDIgMTUuOTE1MSAzNS44NzY4QzE1LjYyNDIgMzMuNTE3MiAxNi4xNDA3IDMwLjk5NjQgMTkuMzg1NSAyOS4zODcyQzIxLjYwMTUgMjguMjg4NSAyNC45MjQ1IDI4LjM2MjIgMjYuOTc0NiAyOC42NzM4TDI2Ljk3NDYgMjQuMDA2N0MyNC4zNTA2IDIzLjYwNjcgMjEuMTg1NiAyMy4zMTYxIDE3Ljk3NzYgMjQuOTAxQzE0LjAwNzYgMjYuODk1MSAxMS45Nzg1IDMwLjY3ODQgMTIuMDE2OSAzNC44MzM2QzEyLjA1NTMgMzguOTg4NyAxNC4yOTMxIDQ0LjIyNzQgMTkuNTUwNSA0NS4wMTI2QzIwLjAxODggNDUuMDg3IDIwLjgzNjggNDUuMDExMSAyMC44NTcyIDQzLjg4NzhWiIgZmlsbD0iIzFDRTMzOCIvPgogIDwvZz4KICA8ZGVmcz4KICAgIDxjbGlwUGF0aCBpZD0iY2xpcDAiPiogICAgICA8cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IndoaXRlIi8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KPC9zdmc+";

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
      <div style="flex-shrink: 0;">
        <img src="${logoUrl}" crossOrigin="anonymous" style="height: 70px; width: auto; object-fit: contain;" />
      </div>
      <div style="flex-grow: 1; padding-left: 30px; text-align: right;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #000; font-family: 'Inter', sans-serif;">CHARTHESS SCHOOL OF FASHION</h1>
        <div style="margin-top: 5px; font-size: 11px; color: #333; line-height: 1.4; text-align: right;">
          <p style="margin: 0;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
          <p style="margin: 0;">Email: charthessfashions@gmail.com</p>
          <p style="margin: 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
        </div>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="border: 4px solid #0A0F1C; padding: 30px; position: relative; overflow: hidden;">
      <img src="${logoUrl}" crossOrigin="anonymous" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; opacity: 0.05; pointer-events: none;" />
      
      ${headerHtml}

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #1CA3B8; text-transform: uppercase;">Official Receipt</h2>
          <p style="margin: 5px 0 0 0; font-weight: bold;">No: ${data.receiptNo}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Date: ${format(data.date, 'PPPP')}</p>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Received From:</div>
          <div style="font-size: 18px; font-weight: bold; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${data.studentName}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Course:</div>
          <div style="font-size: 16px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${data.studentCourse}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">The Sum Of:</div>
          <div style="font-size: 24px; font-weight: 900; color: #0A0F1C; border-bottom: 1px dashed #eee; padding-bottom: 5px;">GH₵ ${data.amount.toLocaleString()}.00</div>
        </div>
        <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; margin-bottom: 2px;">Outstanding Debt</div>
            <div style="font-weight: 900; font-size: 11px; color: #1CA3B8; text-transform: uppercase;">Current Academic Balance</div>
          </div>
          <div style="font-size: 20px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Being Payment For:</div>
          <div style="font-size: 16px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${data.notes || 'School Academic & Practical Fees'}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Payment Method:</div>
          <div style="font-size: 16px; text-transform: capitalize;">${data.method}</div>
        </div>
      </div>

      <!-- Financial Summary Section -->
      <div style="margin: 30px 0; padding: 20px; border: 1px solid #eee; border-radius: 12px; background: #fafafa;">
        <h3 style="margin: 0 0 15px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1CA3B8;">Ledger Statement Summary</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Total Tuition Fee</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900;">GH₵ ${(data.tuitionTotal || 0).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Total Amount Paid</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900; color: #059669;">GH₵ ${(data.totalPaid || data.amount).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Payment Arrears</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</p>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 60px;">
        <div style="font-size: 12px; color: #999;">
          <p style="margin: 0;">This is a computer-generated receipt.</p>
          <p style="margin: 0;">Generated by: ${data.recordedBy || 'System'}</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 200px; border-bottom: 2px solid #0A0F1C; margin-bottom: 10px;"></div>
          <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 12px;">Authorized Signature</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 2px;">
        Empowering Fashion Excellence
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    
    pdf.save(`Receipt_${data.receiptNo}_${data.studentName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};

export const generateInvoicePDF = async (student: any) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '850px';
  receiptContainer.style.padding = '40px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  // Robust SVG Data URI for the logo (Fashion silhouette leaning on 'C')
  const logoUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDApIj4KICAgIDxwYXRoIGQ9Ik0zNSAxNUMzNSAxNy43NjE0IDMyLjc2MTQgMjAgMzAgMjBDMjcuMjM4NiAyMCAyNSAxNy43NjE0IDI1IDE1QzI1IDEyLjIzODYgMjcuMjM4NiAxMCAzMCAxMEMzMi43NjE0IDEwIDM1IDEyLjIzODYgMzUgMTVaIiBmaWxsPSIjMEEwRjFDIi8+CiAgICA8cGF0aCBkPSJNMzAgMjBDMjcuODkzMyAyMC4wMDYxIDI1LjI5MzYgMTkuODQ3OCAyMy40NzgxIEwxNi4zMDYxIDEzLjgwMDhMMTQuOTI3NSAxNy42MjExTDE4LjczNDEgMjUuOTQyOEwxNi4zMDYxIDI2LjU5OTFMMTMuNjc0NyAxOC43MTQ5TDExLjcwNzYgMjQuMTY1Mkw4LjI5MTkzIDIyLjkzOTlMMTMuMTUxIDEzLjM1OTZMMTguMjA4MyAxMC42Nzg5TDI0LjI3NTYgMTQuOTI3NSAyNy44OTMzIDE4LjY3MTdMMzIuMzA2MSAyNS44MDBMMzIuMzA2MSAzMC4zMDRMMzQuOTM3NSA0MC4zMDRMMzQuOTM3NSA0NS4zMDRMMzcuNjQ0IDQ5LjIzNkw0MC4yNzU0IDQ4LjQ5NDRMNDAuMjA5NiA0MC4zMDRMMzcuNjc2OCAzMC40Njg4TDM3LjY3NjggMjUuOTQyOEwzMCAyMFoiIGZpbGw9IiMwQTBGMUMiLz4KICAgIDxwYXRoIGQ9Ik0yMC44NTcyIDQzLjg4NzhMMjAuODU3MiA0MC4xMjY1QzE3Ljg5NjkgNDAuNDYyMiAxNi4yNDQ2IDM4LjQ2NDIgMTUuOTE1MSAzNS44NzY4QzE1LjYyNDIgMzMuNTE3MiAxNi4xNDA3IDMwLjk5NjQgMTkuMzg1NSAyOS4zODcyQzIxLjYwMTUgMjguMjg4NSAyNC45MjQ1IDI4LjM2MjIgMjYuOTc0NiAyOC42NzM4TDI2Ljk3NDYgMjQuMDA2N0MyNC4zNTA2IDIzLjYwNjcgMjEuMTg1NiAyMy4zMTYxIDE3Ljk3NzYgMjQuOTAxQzE0LjAwNzYgMjYuODk1MSAxMS45Nzg1IDMwLjY3ODQgMTIuMDE2OSAzNC44MzM2QzEyLjA1NTMgMzguOTg4NyAxNC4yOTMxIDQ0LjIyNzQgMTkuNTUwNSA0NS4wMTI2QzIwLjAxODggNDUuMDg3IDIwLjgzNjggNDUuMDExMSAyMC44NTcyIDQzLjg4NzhWiIgZmlsbD0iIzFDRTMzOCIvPgogIDwvZz4KICA8ZGVmcz4KICAgIDxjbGlwUGF0aCBpZD0iY2xpcDAiPiogICAgICA8cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IndoaXRlIi8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KPC9zdmc+";

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
      <div style="flex-shrink: 0;">
        <img src="${logoUrl}" crossOrigin="anonymous" style="height: 70px; width: auto; object-fit: contain;" />
      </div>
      <div style="flex-grow: 1; padding-left: 30px; text-align: right;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #000; font-family: 'Inter', sans-serif;">CHARTHESS SCHOOL OF FASHION</h1>
        <div style="margin-top: 5px; font-size: 11px; color: #333; line-height: 1.4; text-align: right;">
          <p style="margin: 0;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
          <p style="margin: 0;">Email: charthessfashions@gmail.com</p>
          <p style="margin: 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
        </div>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="padding: 20px;">
      ${headerHtml}
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 40px; margin-top: 20px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #0A0F1C; text-transform: uppercase; letter-spacing: -1px;">Invoice</h2>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Date: ${format(new Date(), 'PP')}</p>
          <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 13px;">Inv No: INV-${student.id.substring(0, 6).toUpperCase()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-bottom: 40px;">
        <div>
          <p style="text-transform: uppercase; font-size: 11px; font-weight: 900; color: #888; margin-bottom: 10px;">Billing To:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 900;">${student.fullName}</p>
          <p style="margin: 5px 0; color: #666; font-size: 13px;">${student.phone}</p>
          <p style="margin: 0; color: #666; font-size: 13px;">${student.email || student.address || 'Student Record'}</p>
        </div>
        <div style="text-align: right;">
          <p style="text-transform: uppercase; font-size: 11px; font-weight: 900; color: #888; margin-bottom: 10px;">Program Info:</p>
          <p style="margin: 0; font-size: 15px; font-weight: bold;">${student.course}</p>
          <p style="margin: 5px 0; color: #666; font-size: 13px;">Batch: ${student.batch || 'Not Set'}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #0A0F1C; color: white;">
            <th style="padding: 12px 15px; text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Description</th>
            <th style="padding: 12px 15px; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Amount (GH₵)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 20px 15px;">
              <p style="margin: 0; font-weight: bold;">Academic Tuition Fee</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Professional training and practical session fees for the selected program duration.</p>
            </td>
            <td style="padding: 20px 15px; text-align: right; font-weight: bold;">${(student.tuitionTotal || 0).toLocaleString()}.00</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 13px;">Total Fees</span>
            <span style="font-weight: bold;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 13px;">Previously Paid</span>
            <span style="font-weight: bold; color: #059669;">- GH₵ ${(student.amountPaid || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 15px 0; background: #f9f9f9; margin-top: 5px;">
            <span style="font-weight: 900; text-transform: uppercase; padding-left: 10px;">Balance Due</span>
            <span style="font-weight: 900; font-size: 20px; color: #e11d48; padding-right: 10px;">GH₵ ${(student.balance || 0).toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 60px; border-top: 2px solid #0A0F1C; padding-top: 20px;">
        <p style="font-weight: 900; text-transform: uppercase; font-size: 12px; margin-bottom: 10px;">Payment Terms & Instructions:</p>
        <p style="margin: 0; font-size: 11px; color: #666; line-height: 1.6;">
          1. All payments should be made via official channels (Momo/Bank).<br/>
          2. Quote Registration Number CH-${student.id.substring(0, 8).toUpperCase()} as reference.<br/>
          3. Fees paid are non-refundable after 14 days of enrollment.<br/>
          4. Contact finance office for any payment plan adjustments.
        </p>
      </div>
      
      <div style="margin-top: 30px; text-align: center; color: #1CA3B8; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
        Sustainable • Modern • Elegant
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');

    pdf.save(`Invoice_${student.fullName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
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
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '1000px';
  receiptContainer.style.padding = '50px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  // Robust SVG Data URI for the logo (Fashion silhouette leaning on 'C')
  const logoUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDApIj4KICAgIDxwYXRoIGQ9Ik0zNSAxNUMzNSAxNy43NjE0IDMyLjc2MTQgMjAgMzAgMjBDMjcuMjM4NiAyMCAyNSAxNy43NjE0IDI1IDE1QzI1IDEyLjIzODYgMjcuMjM4NiAxMCAzMCAxMEMzMi43NjE0IDEwIDM1IDEyLjIzODYgMzUgMTVaIiBmaWxsPSIjMEEwRjFDIi8+CiAgICA8cGF0aCBkPSJNMzAgMjBDMjcuODkzMyAyMC4wMDYxIDI1LjI5MzYgMTkuODQ3OCAyMy40NzgxIEwxNi4zMDYxIDEzLjgwMDhMMTQuOTI3NSAxNy42MjExTDE4LjczNDEgMjUuOTQyOEwxNi4zMDYxIDI2LjU5OTFMMTMuNjc0NyAxOC43MTQ5TDExLjcwNzYgMjQuMTY1Mkw4LjI5MTkzIDIyLjkzOTlMMTMuMTUxIDEzLjM1OTZMMTguMjA4MyAxMC42Nzg5TDI0LjI3NTYgMTQuOTI3NSAyNy44OTMzIDE4LjY3MTdMMzIuMzA2MSAyNS44MDBMMzIuMzA2MSAzMC4zMDRMMzQuOTM3NSA0MC4zMDRMMzQuOTM3NSA0NS4zMDRMMzcuNjQ0IDQ5LjIzNkw0MC4yNzU0IDQ4LjQ5NDRMNDAuMjA5NiA0MC4zMDRMMzcuNjc2OCAzMC40Njg4TDM3LjY3NjggMjUuOTQyOEwzMCAyMFoiIGZpbGw9IiMwQTBGMUMiLz4KICAgIDxwYXRoIGQ9Ik0yMC44NTcyIDQzLjg4NzhMMjAuODU3MiA0MC4xMjY1QzE3Ljg5NjkgNDAuNDYyMiAxNi4yNDQ2IDM4LjQ2NDIgMTUuOTE1MSAzNS44NzY4QzE1LjYyNDIgMzMuNTE3MiAxNi4xNDA3IDMwLjk5NjQgMTkuMzg1NSAyOS4zODcyQzIxLjYwMTUgMjguMjg4NSAyNC45MjQ1IDI4LjM2MjIgMjYuOTc0NiAyOC42NzM4TDI2Ljk3NDYgMjQuMDA2N0MyNC4zNTA2IDIzLjYwNjcgMjEuMTg1NiAyMy4zMTYxIDE3Ljk3NzYgMjQuOTAxQzE0LjAwNzYgMjYuODk1MSAxMS45Nzg1IDMwLjY3ODQgMTIuMDE2OSAzNC44MzM2QzEyLjA1NTMgMzguOTg4NyAxNC4yOTMxIDQ0LjIyNzQgMTkuNTUwNSA0NS4wMTI2QzIwLjAxODggNDUuMDg3IDIwLjgzNjggNDUuMDExMSAyMC44NTcyIDQzLjg4NzhWiIgZmlsbD0iIzFDRTMzOCIvPgogIDwvZz4KICA8ZGVmcz4KICAgIDxjbGlwUGF0aCBpZD0iY2xpcDAiPiogICAgICA8cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IndoaXRlIi8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KPC9zdmc+";
  const student = data.student;

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
      <div style="flex-shrink: 0;">
        <img src="${logoUrl}" crossOrigin="anonymous" style="height: 70px; width: auto; object-fit: contain;" />
      </div>
      <div style="flex-grow: 1; padding-left: 30px; text-align: right;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #000; font-family: 'Inter', sans-serif;">CHARTHESS SCHOOL OF FASHION</h1>
        <div style="margin-top: 5px; font-size: 11px; color: #333; line-height: 1.4; text-align: right;">
          <p style="margin: 0;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
          <p style="margin: 0;">Email: charthessfashions@gmail.com</p>
          <p style="margin: 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
        </div>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="border: 2px solid #0A0F1C; padding: 40px; position: relative; background: #fff;">
      ${headerHtml}

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="text-align: right;">
          <div style="background: #0A0F1C; color: white; padding: 10px 20px; font-weight: 900; text-transform: uppercase; font-size: 18px; margin-bottom: 10px;">Official Enrollment Document</div>
          <p style="margin: 0; font-weight: bold;">Admission No: CH-${student.id ? student.id.substring(0, 8).toUpperCase() : 'NEW'}</p>
          <p style="margin: 2px 0 0 0; font-size: 13px;">Dated: ${format(new Date(student.enrollmentDate || Date.now()), 'PPPP')}</p>
        </div>
      </div>

      <!-- Student Header -->
      <div style="display: flex; gap: 40px; margin-bottom: 40px; background: #f9f9f9; padding: 30px; border-radius: 20px; border: 1px solid #eee;">
        <div style="width: 180px; height: 180px; background: #eee; border: 4px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 15px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${student.photoUrl ? `<img src="${student.photoUrl}" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="font-size: 10px; color: #999; text-transform: uppercase; text-align: center;">Official Photograph<br/>Required</div>'}
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="grid-column: span 2; border-bottom: 2px solid #0A0F1C; padding-bottom: 10px;">
            <p style="margin: 0; font-size: 11px; color: #1CA3B8; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Scholar Full Identity</p>
            <h2 style="margin: 5px 0 0 0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #0A0F1C;">${student.surname}, ${student.firstName} ${student.otherNames || ''}</h2>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase; font-weight: 900;">Academic Program</p>
            <p style="margin: 3px 0 0 0; font-size: 16px; font-weight: bold; color: #0A0F1C;">${student.course} ${student.courseOther ? `(${student.courseOther})` : ''}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Track: ${student.specialization || 'Not Specified'}</p>
          </div>
          <div>
             <p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase; font-weight: 900;">Intake Batch & Mode</p>
             <p style="margin: 3px 0 0 0; font-size: 16px; font-weight: bold; color: #0A0F1C;">${student.batch || 'Unassigned'} | ${student.mode || 'N/A'}</p>
             <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Status: ${student.status}</p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
        <!-- Left Column -->
        <div>
          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Personal Demographics</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <p><strong>Gender:</strong> ${student.gender}</p>
              <p><strong>DOB/Age:</strong> ${student.dob} (${student.age} yrs)</p>
              <p><strong>Nationality:</strong> ${student.nationality}</p>
              <p><strong>Marital:</strong> ${student.maritalStatus}</p>
              <p style="grid-column: span 2;"><strong>Digital Address:</strong> ${student.digitalAddress || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Address:</strong> ${student.address}</p>
              <p><strong>Primary Contact:</strong> ${student.phone}</p>
              <p><strong>Alt Contact:</strong> ${student.alternatePhone || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Email:</strong> ${student.email || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Academic Background</h3>
            <div style="font-size: 12px; line-height: 1.6;">
              <p><strong>Highest Education:</strong> ${student.educationLevel}</p>
              <p><strong>Last Institution:</strong> ${student.lastSchool}</p>
              <p><strong>Program Studied:</strong> ${student.programStudied || 'N/A'}</p>
              <p><strong>Qualifications:</strong> ${student.qualifications || 'N/A'}</p>
              <p><strong>Completion Year:</strong> ${student.yearCompleted}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Health & Safety</h3>
            <div style="font-size: 12px;">
              <p><strong>Medical Condition:</strong> ${student.hasMedicalCondition}</p>
              <p><strong>Details:</strong> ${student.medicalDetails || 'None recorded'}</p>
              <p><strong>Emergency Contact:</strong> ${student.emergencyContactName} (${student.emergencyContactPhone})</p>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Guardian Particulars</h3>
            <div style="font-size: 12px;">
              <div style="padding-bottom: 15px; border-bottom: 1px dashed #eee; margin-bottom: 15px;">
                <p><strong>Primary Guardian:</strong> ${student.guardianName}</p>
                <p><strong>Relationship:</strong> ${student.guardianRelationship}</p>
                <p><strong>Occupation:</strong> ${student.guardianOccupation}</p>
                <p><strong>Phone:</strong> ${student.guardianPhone}</p>
              </div>
              <div>
                <p><strong>Secondary Guardian:</strong> ${student.secondaryGuardianName || 'None'}</p>
                <p><strong>Contact:</strong> ${student.secondaryGuardianPhone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Financial Settlement</h3>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 15px; border: 2px solid #e2e8f0; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-weight: bold;">Admission Fee:</span>
                <span style="font-weight: 900;">GH₵ ${(student.registrationFee || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-weight: bold;">Tuition Billing:</span>
                <span style="font-weight: 900;">GH₵ ${(student.tuitionFee || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 10px;">
                <span style="font-weight: 900; text-transform: uppercase; color: #0f172a;">Total Contract:</span>
                <span style="font-weight: 900; font-size: 18px; color: #0f172a;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-weight: bold;">Paid to Date:</span>
                <span style="font-weight: 900; color: #059669;">GH₵ ${(student.amountPaid || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px; background: #ffe4e6; border-radius: 8px; margin-top: 10px;">
                <span style="font-weight: 900; color: #e11d48; text-transform: uppercase;">Outstanding:</span>
                <span style="font-weight: 900; color: #e11d48;">GH₵ ${(student.balance || 0).toLocaleString()}</span>
              </div>
              <p style="margin: 15px 0 0 0; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1CA3B8; letter-spacing: 1px;">Plan: ${student.paymentPlan}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 30px;">
             <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Identification Record</h3>
             <p style="margin: 0; font-size: 12px;"><strong>${student.idType} No:</strong> ${student.idNumber || 'Not Referenced'}</p>
          </div>
        </div>
      </div>

      <!-- Oath -->
      <div style="margin-top: 40px; padding: 30px; background: #0A0F1C; color: white; border-radius: 20px;">
        <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #1CA3B8; letter-spacing: 2px;">Enrollee Declaration</h4>
        <p style="margin: 0; font-size: 12px; line-height: 1.8; font-style: italic; opacity: 0.8;">
          "I hereby certify that all information submitted in this admission protocol is accurate to the best of my knowledge. I commit to honoring the institutional guidelines, academic standards, and financial obligations of Charthess School of Fashion throughout my tenure as a scholar."
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
          <div style="text-align: center;">
            <p style="margin: 0 0 5px 0; font-family: 'Playfair Display', serif; font-size: 20px; color: #1CA3B8;">${student.studentSignature || student.fullName}</p>
            <div style="width: 250px; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 5px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Scholar Digital Signature</p>
          </div>
          <div style="text-align: center;">
            <div style="width: 250px; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 5px; margin-top: 25px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Admissions Directorate</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 3px;">
        Excellence in Fashion Education & Industrial Training
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');

    pdf.save(`Enrollment_Form_${student.fullName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};
