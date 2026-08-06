import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateMiniStatementPDF = async (transactions, user, accountNumber, startDate, endDate) => {
    const pdf = new jsPDF();

    const primaryColor = [102, 126, 234]; // Bank blue
    const secondaryColor = [108, 117, 125]; // Gray
    const textColor = [51, 51, 51]; // Dark gray

    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BankPro', 20, 20);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Mini Statement', 20, 30);

    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    const rightX = 150;
    const rightMargin = 10;
    const rightWidth = 210 - rightX - rightMargin; // PDF width 210mm

    const genOnLines = pdf.splitTextToSize('Generated on: ' + new Date().toLocaleDateString(), rightWidth);
    pdf.text(genOnLines, rightX, 15);

    const accLines = pdf.splitTextToSize('Account: ' + accountNumber, rightWidth);
    pdf.text(accLines, rightX, 25);

    const periodLines = pdf.splitTextToSize('Period: ' + startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString(), rightWidth);
    pdf.text(periodLines, rightX, 35);

    const currLines = pdf.splitTextToSize('Currency: INR (Rs)', rightWidth);
    pdf.text(currLines, rightX, 45);

    let yPosition = 50;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer Details', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Name: ' + (user?.name || 'N/A'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Type: ' + (user?.accountType || 'Savings'), 20, yPosition);
    yPosition += 6;
    const acctLabel = 'Account Number: ' + accountNumber;
    const leftMargin = 20;
    const availableWidth = 210 - leftMargin - 20; // keep 20mm right padding
    const acctLines = pdf.splitTextToSize(acctLabel, availableWidth);
    pdf.text(acctLines, leftMargin, yPosition);

    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transaction Summary', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    pdf.text('Total Credits: Rs ' + totalCredits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Debits: Rs ' + totalDebits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Net Balance: Rs ' + (totalCredits - totalDebits).toFixed(2), 20, yPosition);

    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recent Transactions', 20, yPosition);

    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPosition);
    pdf.text('Description', 50, yPosition);
    pdf.text('Type', 120, yPosition);
    pdf.text('Amount', 150, yPosition);

    pdf.setDrawColor(...secondaryColor);
    pdf.line(20, yPosition + 2, 190, yPosition + 2);

    yPosition += 8;
    pdf.setFont('helvetica', 'normal');

    transactions.slice(0, 10).forEach((transaction) => {
        if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
        }

        const rawDate = transaction.createdAt || transaction.date;
        let formattedDate = 'N/A';
        if (rawDate) {
            const d = new Date(rawDate);
            formattedDate = isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
        }

        const description = transaction.description || 'Transaction';
        const type = transaction.type ? (transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)) : 'N/A';
        const amount = transaction.amount ? ('Rs ' + parseFloat(transaction.amount).toFixed(2)) : 'Rs 0.00';

        pdf.text(formattedDate, 20, yPosition);
        pdf.text(description.substring(0, 30), 50, yPosition);
        pdf.text(type, 120, yPosition);
        pdf.text(amount, 150, yPosition);

        yPosition += 6;
    });

    pdf.setFontSize(8);
    pdf.setTextColor(...secondaryColor);
    pdf.text('This is a computer-generated statement. For any discrepancies, please contact customer support.', 20, 285);
    pdf.text('BankPro - Your Trusted Banking Partner', 105, 285, { align: 'center' });

    const fileName = `mini_statement_${accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};

export const generatePDFFromHTML = async (element, fileName) => {
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();

        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(fileName);
    } catch (error) {
        
        throw error;
    }
};

export const generateAccountStatementPDF = async (transactions, user, accountNumber, startDate, endDate) => {
    const pdf = new jsPDF();

    pdf.setFillColor(102, 126, 234);
    pdf.rect(0, 0, 210, 50, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BankPro', 20, 25);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Account Statement', 20, 35);

    pdf.setTextColor(51, 51, 51);
    pdf.setFontSize(10);
    const rightX2 = 150;
    const rightMargin2 = 10;
    const rightWidth2 = 210 - rightX2 - rightMargin2;

    const genOnLines2 = pdf.splitTextToSize('Generated on: ' + new Date().toLocaleDateString(), rightWidth2);
    pdf.text(genOnLines2, rightX2, 20);

    const accLines2 = pdf.splitTextToSize('Account: ' + accountNumber, rightWidth2);
    pdf.text(accLines2, rightX2, 30);

    const periodLines2 = pdf.splitTextToSize('Period: ' + startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString(), rightWidth2);
    pdf.text(periodLines2, rightX2, 40);

    const currLines2 = pdf.splitTextToSize('Currency: INR (Rs)', rightWidth2);
    pdf.text(currLines2, rightX2, 50);

    let yPosition = 60;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Account Information', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Account Holder: ' + (user?.name || 'N/A'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Type: ' + (user?.accountType || 'Savings'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Number: ' + accountNumber, 20, yPosition);
    yPosition += 6;
    pdf.text('Branch: Main Branch', 20, yPosition);

    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Balance Summary', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const openingBalance = 1000; // This should be calculated from actual data
    const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const closingBalance = openingBalance + totalCredits - totalDebits;

    pdf.text('Opening Balance: Rs ' + openingBalance.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Credits: Rs ' + totalCredits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Debits: Rs ' + totalDebits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Closing Balance: Rs ' + closingBalance.toFixed(2), 20, yPosition);

    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transaction Details', 20, yPosition);

    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPosition);
    pdf.text('Time', 40, yPosition);
    pdf.text('Description', 60, yPosition);
    pdf.text('Reference', 100, yPosition);
    pdf.text('Debit', 155, yPosition, { align: 'right' });
    pdf.text('Credit', 185, yPosition, { align: 'right' });

    pdf.setDrawColor(108, 117, 125);
    pdf.line(20, yPosition + 2, 190, yPosition + 2);

    yPosition += 8;
    pdf.setFont('helvetica', 'normal');

    transactions.forEach((transaction) => {
        if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
        }

        const rawDate = transaction.createdAt || transaction.date;
        let formattedDate = 'N/A';
        let formattedTime = 'N/A';
        if (rawDate) {
            const d = new Date(rawDate);
            formattedDate = isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
            formattedTime = isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const description = (transaction.description || 'Transaction').substring(0, 25);
        const reference = (transaction.id || 'N/A').toString().substring(0, 18); // Truncate for fit
        const debit = transaction.type === 'debit' ? 'Rs ' + parseFloat(transaction.amount).toFixed(2) : '';
        const credit = transaction.type === 'credit' ? 'Rs ' + parseFloat(transaction.amount).toFixed(2) : '';

        pdf.text(formattedDate, 20, yPosition);
        pdf.text(formattedTime, 40, yPosition);
        pdf.text(description, 60, yPosition);
        pdf.text(reference, 100, yPosition);
        pdf.text(debit, 155, yPosition, { align: 'right' });
        pdf.text(credit, 185, yPosition, { align: 'right' });

        yPosition += 8;
    });

    pdf.setFontSize(8);
    pdf.setTextColor(108, 117, 125);
    pdf.text('This is a computer-generated statement and does not require a signature.', 20, 285);
    pdf.text('For any queries, please contact BankPro customer support.', 20, 290);
    pdf.text('Page 1 of 1', 180, 285);

    const fileName = `account_statement_${accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};
