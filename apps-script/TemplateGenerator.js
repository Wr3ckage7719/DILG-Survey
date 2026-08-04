/**
 * TemplateGenerator.gs
 * Builds a Google Doc template matching FM-SP-DILG-07-07B layout
 * with all {{placeholders}} embedded for automated data merge.
 *
 * Run once: DILG Survey → Generate Template Document
 * Then configure it in Settings.
 */

function generateTemplateDoc() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Template Name',
    'Pangalan ng template document:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  var docName = response.getResponseText().trim() || 'DILG Survey Template (Auto-Generated)';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();

  // Page setup: Letter size, narrow margins
  body.setPageWidth(612).setPageHeight(792);
  body.setMarginLeft(54).setMarginRight(54).setMarginTop(54).setMarginBottom(54);

  // ────────────────────────────────────────
  // Styles
  // ────────────────────────────────────────
  var style = {};
  style.title = {};
  style.title[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.title[DocumentApp.Attribute.FONT_SIZE] = 12;
  style.title[DocumentApp.Attribute.BOLD] = true;
  style.title[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;

  style.normal = {};
  style.normal[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.normal[DocumentApp.Attribute.FONT_SIZE] = 10;

  style.bold = {};
  style.bold[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.bold[DocumentApp.Attribute.FONT_SIZE] = 10;
  style.bold[DocumentApp.Attribute.BOLD] = true;

  style.header = {};
  style.header[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.header[DocumentApp.Attribute.FONT_SIZE] = 11;
  style.header[DocumentApp.Attribute.BOLD] = true;

  style.section = {};
  style.section[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.section[DocumentApp.Attribute.FONT_SIZE] = 10;
  style.section[DocumentApp.Attribute.BOLD] = true;

  style.italic = {};
  style.italic[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.italic[DocumentApp.Attribute.FONT_SIZE] = 9;
  style.italic[DocumentApp.Attribute.ITALIC] = true;

  style.small = {};
  style.small[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.small[DocumentApp.Attribute.FONT_SIZE] = 8;

  style.colHeader = {};
  style.colHeader[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style.colHeader[DocumentApp.Attribute.FONT_SIZE] = 8;
  style.colHeader[DocumentApp.Attribute.BOLD] = true;
  style.colHeader[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;

  // ────────────────────────────────────────
  // Helper: add paragraph with styling
  // ────────────────────────────────────────
  function addPara(text, attrs) {
    var p = body.appendParagraph(text);
    if (attrs) p.setAttributes(attrs);
    return p;
  }

  function addEmpty() {
    return body.appendParagraph('').setAttributes(style.normal);
  }

  function addBulletOption(placeholderKey, label) {
    var p = body.appendParagraph('{{' + placeholderKey + '}} ' + label);
    p.setAttributes(style.normal);
    return p;
  }

  function addRadioLine(placeholderKey, label) {
    var p = body.appendParagraph('{{' + placeholderKey + '}} ' + label);
    p.setAttributes(style.normal);
    return p;
  }

  // ────────────────────────────────────────
  // Build document
  // ────────────────────────────────────────

  // === HEADER ===
  addPara('DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT', style.title);
  addPara('CLIENT SATISFACTION SURVEY (ON-SITE)', style.title);
  addEmpty();

  var headerTable = body.appendTable();
  var hdrRow = headerTable.appendTableRow();

  var cellLeft = hdrRow.appendTableCell();
  cellLeft.appendParagraph('Document Code').setAttributes(style.small);
  cellLeft.appendParagraph('FM-SP-DILG-07-07B').setAttributes(style.bold);

  var cellMid = hdrRow.appendTableCell();
  cellMid.appendParagraph('Rev. No.').setAttributes(style.small);
  cellMid.appendParagraph('').setAttributes(style.bold);

  var cellMid2 = hdrRow.appendTableCell();
  cellMid2.appendParagraph('Eff. Date').setAttributes(style.small);
  cellMid2.appendParagraph('01.01.24').setAttributes(style.bold);

  var cellRight = hdrRow.appendTableCell();
  cellRight.appendParagraph('Page').setAttributes(style.small);
  cellRight.appendParagraph('01 of ___').setAttributes(style.bold);

  headerTable.setBorderWidth(0.5);
  addEmpty();

  // === OFFICE DETAILS ===
  addPara('Sasagutan ng DILG Personnel', style.header);
  addEmpty();

  addPara('Pangalan ng tanggapan/operating unit: {{pangalanNgTanggapan}}', style.section);
  addPara('Serbisyong ibinigay: {{serbisyongIbinigay}}', style.section);
  addEmpty();

  // === CLIENT MESSAGE ===
  addPara('Minamahal naming kliyente,', style.normal);
  addPara(
    'Pakisagutan ang sarbey na ito at ilahad ang inyong mga puna sa serbisyong aming binigay. ' +
    'Aming kinakalap ang inyong personal na datos para sa pagsusuring maaaring gawin ng DILG. ' +
    'Ang inyong datos ay itatago sa aming database o sa isang ligtas na locker para sa mga pisikal na form ' +
    'sa loob ng dalawang taon bago tuluyang burahin sa aming talaan.',
    style.italic
  );
  addEmpty();

  // === DEMOGRAPHICS ===
  addPara('Uri ng Kliyente:', style.section);
  addRadioLine('uri_mamamayan', 'Mamamayan');
  addRadioLine('uri_negosyo', 'Negosyo');
  addRadioLine('uri_gobyerno_empleyado_o_mula_sa_ibang_ahensiya', 'Gobyerno (empleyado o mula sa ibang ahensiya)');
  addEmpty();

  addPara('Petsa: {{petsa}}', style.section);
  addEmpty();

  addPara('Edad:', style.section);
  addRadioLine('edad_mas_mababa_sa_18_yo', 'Mas mababa sa 18 y/o');
  addRadioLine('edad_18_24_yo', '18-24 y/o');
  addRadioLine('edad_25_34_yo', '25-34 y/o');
  addRadioLine('edad_35_44_yo', '35-44 y/o');
  addRadioLine('edad_45_54_yo', '45-54 y/o');
  addRadioLine('edad_55_64_yo', '55-64 y/o');
  addRadioLine('edad_65_yo_pataas', '65 y/o pataas');
  addEmpty();

  addPara('Kasarian:', style.section);
  addRadioLine('kasarian_lalaki', 'Lalaki');
  addRadioLine('kasarian_babae', 'Babae');
  addRadioLine('kasarian_lgbtqia', 'LGBTQIA+');
  addRadioLine('kasarian_hindi_nais_sabihin', 'Hindi nais sabihin');
  addEmpty();

  addPara('Rehiyon ng tirahan: {{rehiyon}}', style.section);
  addEmpty();
  addEmpty();

  // === CITIZEN'S CHARTER ===
  addPara(
    'Panuto: Lagyan ng tsek (✔) ang iyong sagot sa mga sumusunod na tanong tungkol sa Gabay ng Mamamayan ng DILG. ' +
    'Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo ng isang tanggapan ng pamahalaan at ' +
    'mga kaakibat nitong kahilingan, babayaran, at tagal ng pagpoproseso, atbp.',
    style.italic
  );
  addEmpty();

  addPara('CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?', style.section);
  addRadioLine('cc1_alam_ko_kung_ano_ang_gabay_at_nakita_ko_ang_gabay_ng_tang',
    'Alam ko kung ano ang Gabay, at nakita ko ang Gabay ng tanggapang ito.');
  addRadioLine('cc1_alam_ko_kung_ano_ang_gabay_ngunit_hindi_ko_nakita_ang_gab',
    'Alam ko kung ano ang Gabay, ngunit hindi ko nakita ang Gabay ng tanggapang ito.');
  addRadioLine('cc1_nalaman_ko_kung_ano_ang_gabay_noong_nakita_ko_ang_gabay_ng',
    'Nalaman ko kung ano ang Gabay noong nakita ko ang Gabay ng tanggapang ito.');
  addRadioLine('cc1_hindi_ko_alam_kung_ano_ang_gabay_at_hindi_ako_nakakakita_ng',
    'Hindi ko alam kung ano ang Gabay, at hindi ako nakakita ng Gabay sa tanggapang ito. (Piliin ang N/A)');
  addEmpty();

  addPara('CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:', style.section);
  addRadioLine('cc2_madaling_makita', 'Madaling makita');
  addRadioLine('cc2_bahagyang_nakikita', 'Bahagyang nakikita');
  addRadioLine('cc2_mahirap_makita', 'Mahirap makita');
  addRadioLine('cc2_hindi_makita', 'Hindi makita');
  addRadioLine('cc2_na', 'N/A');
  addEmpty();

  addPara('CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?', style.section);
  addRadioLine('cc3_lubos_na_nakatulong', 'Lubos na nakatulong');
  addRadioLine('cc3_bahagyang_nakatulong', 'Bahagyang nakatulong');
  addRadioLine('cc3_hindi_nakatulong', 'Hindi nakatulong');
  addRadioLine('cc3_na', 'N/A');
  addEmpty();
  addEmpty();

  // === SQD ===
  addPara(
    'Panuto: Para sa mga sumusunod na bilang, lagyan ng tsek (✓) ang hanay na pinakaangkop sa iyong sagot.',
    style.italic
  );
  addEmpty();

  // SQD table: 1 header row + 9 data rows, 7 columns total (label + 6 ratings)
  var sqdTable = body.appendTable();
  sqdTable.setBorderWidth(0.5);

  // Header row
  var hdr = sqdTable.appendTableRow();
  hdr.appendTableCell('').setAttributes(style.colHeader);
  hdr.appendTableCell('Lubos na sang-ayon').setAttributes(style.colHeader);
  hdr.appendTableCell('Sang-ayon').setAttributes(style.colHeader);
  hdr.appendTableCell('Walang kinikilingan').setAttributes(style.colHeader);
  hdr.appendTableCell('Hindi sang-ayon').setAttributes(style.colHeader);
  hdr.appendTableCell('Lubos na hindi sang-ayon').setAttributes(style.colHeader);
  hdr.appendTableCell('N/A').setAttributes(style.colHeader);

  var sqdLabels = [
    'SQD0. Nasiyahan ako sa serbisyo na aking hiniling.',
    'SQD1. Makatuwiran ang oras na aking inilaan para sa transaksiyon.',
    'SQD2. Sinunod ng tanggapan ang mga kahilingan at hakbang batay sa impormasyong ibinigay.',
    'SQD3. Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.',
    'SQD4. Madali kong nahanap ang impormasyon tungkol sa aking transaksiyon mula sa tanggapan o kanilang website.',
    'SQD5. Nagbayad ako ng makatwirang halaga para sa aking transaksyon. (Kung libre, piliin ang N/A)',
    'SQD6. Pakiramdam ko ay patas sa lahat o walang palakasan sa tanggapan para sa aking transaksiyon.',
    'SQD7. Matulungin at magalang ang pakikitungo sa akin ng mga kawani.',
    'SQD8. Nakuha ko ang kinakailangan ko mula sa tanggapan. Kung tinanggihan man, sapat na ipinaliwanag.'
  ];

  var colKeys = [
    'lubos_na_sang_ayon', 'sang_ayon', 'walang_kinikilingan',
    'hindi_sang_ayon', 'lubos_na_hindi_sang_ayon', 'na'
  ];

  for (var r = 0; r < sqdLabels.length; r++) {
    var row = sqdTable.appendTableRow();
    row.appendTableCell(sqdLabels[r]).setAttributes(style.normal);

    for (var c = 0; c < colKeys.length; c++) {
      var cell = row.appendTableCell('{{sqd' + r + '_' + colKeys[c] + '}}');
      cell.setAttributes(style.normal);
    }
  }

  // Set column widths for SQD table
  var sqdCols = sqdTable.getRow(0).getNumChildren();
  sqdTable.getRow(0).getCell(0).setWidth(220);
  for (var c2 = 1; c2 < sqdCols; c2++) {
    sqdTable.getRow(0).getCell(c2).setWidth(55);
  }

  addEmpty();
  addEmpty();

  // === FEEDBACK ===
  addPara('Mga mungkahi sa kung paano pa mapapabuti ang aming serbisyo:', style.section);
  addPara('{{mgaMungkahi}}', style.normal);
  addEmpty();
  addEmpty();

  addPara('Pangalan (optional): {{pangalan}}', style.normal);
  addEmpty();

  addPara('Contact number: {{contactNumber}}', style.normal);
  addEmpty();

  addPara('Email address: {{emailAddress}}', style.normal);
  addEmpty();

  // ────────────────────────────────────────
  // Save and configure
  // ────────────────────────────────────────

  doc.saveAndClose();

  // Auto-configure as template in settings
  var docFile = DriveApp.getFileById(doc.getId());
  SCRIPT_PROP.setProperty('TEMPLATE_DOC_ID', doc.getId());

  // Move to template folder
  var templateFolder = getTemplateFolder();
  var parents = docFile.getParents();
  while (parents.hasNext()) {
    parents.next().removeFile(docFile);
  }
  templateFolder.addFile(docFile);

  var url = doc.getUrl();
  ui.alert(
    'Template Created!',
    'Template document with all placeholders is ready.\n\n' +
    'Name: ' + docName + '\n' +
    'URL: ' + url + '\n\n' +
    'Template auto-configured in Settings.\n' +
    'You may edit the doc to adjust formatting, fonts, or layout.',
    ui.ButtonSet.OK
  );

  return doc.getId();
}

// ──────────────────────────────────
// Get or create template folder in Drive
// ──────────────────────────────────

function getTemplateFolder() {
  var folderId = SCRIPT_PROP.getProperty('TEMPLATE_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { /* fall through */ }
  }

  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  var parentFolders = ssFile.getParents();
  var parent = parentFolders.hasNext() ? parentFolders.next() : DriveApp.getRootFolder();

  var folder = parent.createFolder(TEMPLATE_FOLDER_NAME);
  SCRIPT_PROP.setProperty('TEMPLATE_FOLDER_ID', folder.getId());
  return folder;
}
