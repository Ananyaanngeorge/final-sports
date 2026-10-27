/**
 * Sports Equipment Management System
 * Browser-based Frontend JavaScript Application
 * Communicates with Spring Boot REST API endpoints:
 *   - /api/dashboard
 *   - /api/equipment
 *   - /api/students
 *   - /api/issues
 */

const API_BASE = '/api';

// Cached Data
let cachedEquipment = [];
let cachedStudents = [];
let cachedActiveIssues = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupMobileSidebar();
    setupEventListeners();

    // Default issue date to today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const issueDateInput = document.getElementById('issueDateInput');
    if (issueDateInput) {
        issueDateInput.value = today;
        const dueInput = document.getElementById('issueDueDateInput');
        if (dueInput) { const due = new Date(); due.setDate(due.getDate() + 7); dueInput.value = due.toISOString().split('T')[0]; dueInput.min = today; }
    }

    // Load initial dashboard data
    loadDashboardData();
});

// ========================================================
// 1. Navigation & Page Switching
// ========================================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        dashboard: 'System Overview & Live Dashboard',
        equipment: 'Sports Equipment Inventory',
        students: 'Registered College Students',
        issue: 'Issue Equipment to Student',
        return: 'Return Borrowed Equipment',
        fines: 'Late Return Fine Management'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');

            navItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => {
                if (sec.id === `section-${targetPage}`) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            if (pageTitle && titles[targetPage]) {
                pageTitle.textContent = titles[targetPage];
            }

            // Close mobile sidebar on selection
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('open');

            // Trigger data load based on selected page
            if (targetPage === 'dashboard') loadDashboardData();
            if (targetPage === 'equipment') loadEquipmentData();
            if (targetPage === 'students') loadStudentsData();
            if (targetPage === 'issue') loadIssueFormData();
            if (targetPage === 'return') loadActiveIssuesData();
            if (targetPage === 'fines') loadFineData();
        });
    });
}

function setupMobileSidebar() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
}

function setupEventListeners() {
    // Refresh button in top nav
    const btnRefresh = document.getElementById('btnRefreshData');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadDashboardData();
            loadEquipmentData();
            loadStudentsData();
            loadActiveIssuesData();
            showToast('All data refreshed from database.', 'info');
        });
    }

    // Equipment Search & Category Filter
    const equipSearch = document.getElementById('equipmentSearchInput');
    const equipCategory = document.getElementById('equipmentCategoryFilter');
    if (equipSearch) equipSearch.addEventListener('input', () => filterEquipment());
    if (equipCategory) equipCategory.addEventListener('change', () => filterEquipment());

    // Student Search
    const studentSearch = document.getElementById('studentSearchInput');
    if (studentSearch) studentSearch.addEventListener('input', () => filterStudents());

    // Modals: Equipment
    const openAddEquipBtn = document.getElementById('btnOpenAddEquipmentModal');
    const closeEquipBtn = document.getElementById('closeEquipmentModalBtn');
    const cancelEquipBtn = document.getElementById('cancelEquipmentBtn');
    const equipForm = document.getElementById('equipmentForm');

    if (openAddEquipBtn) openAddEquipBtn.addEventListener('click', () => openEquipmentModal());
    if (closeEquipBtn) closeEquipBtn.addEventListener('click', () => closeEquipmentModal());
    if (cancelEquipBtn) cancelEquipBtn.addEventListener('click', () => closeEquipmentModal());
    if (equipForm) equipForm.addEventListener('submit', handleSaveEquipment);

    // Modals: Student
    const openAddStudentBtn = document.getElementById('btnOpenAddStudentModal');
    const closeStudentBtn = document.getElementById('closeStudentModalBtn');
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');
    const studentForm = document.getElementById('studentForm');

    if (openAddStudentBtn) openAddStudentBtn.addEventListener('click', () => openStudentModal());
    if (closeStudentBtn) closeStudentBtn.addEventListener('click', () => closeStudentModal());
    if (cancelStudentBtn) cancelStudentBtn.addEventListener('click', () => closeStudentModal());
    if (studentForm) studentForm.addEventListener('submit', handleSaveStudent);

    // Issue Equipment Form
    const equipSelect = document.getElementById('issueEquipmentSelect');
    if (equipSelect) {
        equipSelect.addEventListener('change', updateStockPreview);
    }

    const issueForm = document.getElementById('issueEquipmentForm');
    if (issueForm) {
        issueForm.addEventListener('submit', handleIssueEquipment);
    }

    // Return Equipment Search, Filter & View Toggle
    const returnSearch = document.getElementById('returnSearchInput');
    const returnStatus = document.getElementById('returnStatusFilter');
    const btnCardsView = document.getElementById('btnReturnCardsView');
    const btnTableView = document.getElementById('btnReturnTableView');
    const cardsContainer = document.getElementById('activeIssuesCardsContainer');
    const tableWrapper = document.getElementById('activeIssuesTableWrapper');

    if (returnSearch) returnSearch.addEventListener('input', () => filterActiveIssues());
    if (returnStatus) returnStatus.addEventListener('change', () => loadActiveIssuesData());

    if (btnCardsView && btnTableView) {
        btnCardsView.addEventListener('click', () => {
            btnCardsView.classList.add('active');
            btnTableView.classList.remove('active');
            if (cardsContainer) cardsContainer.style.display = 'grid';
            if (tableWrapper) tableWrapper.style.display = 'none';
        });

        btnTableView.addEventListener('click', () => {
            btnTableView.classList.add('active');
            btnCardsView.classList.remove('active');
            if (cardsContainer) cardsContainer.style.display = 'none';
            if (tableWrapper) tableWrapper.style.display = 'block';
        });
    }
}

// ========================================================
// 2. DASHBOARD MODULE
// ========================================================
async function loadDashboardData() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`);
        if (!res.ok) throw new Error('Failed to fetch dashboard metrics.');
        const data = await res.json();

        // Update KPI values
        document.getElementById('kpiTotalTypes').textContent = data.totalEquipmentTypes ?? 0;
        document.getElementById('kpiTotalQuantity').textContent = data.totalEquipmentQuantity ?? 0;
        document.getElementById('kpiAvailableQuantity').textContent = data.availableQuantity ?? 0;
        document.getElementById('kpiIssuedQuantity').textContent = data.currentlyIssuedQuantity ?? 0;
        document.getElementById('kpiRegisteredStudents').textContent = data.registeredStudents ?? 0;

        // Render Recent Transactions Table
        const recentBody = document.getElementById('recentTransactionsTableBody');
        if (recentBody) {
            recentBody.innerHTML = '';
            if (data.recentTransactions && data.recentTransactions.length > 0) {
                data.recentTransactions.forEach(i => {
                    const row = document.createElement('tr');
                    const badgeClass = i.status === 'ISSUED' ? 'badge-amber' : 'badge-green';
                    row.innerHTML = `
                        <td><strong>#${i.id}</strong></td>
                        <td>${escapeHtml(i.student?.fullName || '-')}</td>
                        <td>${escapeHtml(i.equipment?.name || '-')}</td>
                        <td>${i.quantity}</td>
                        <td>${i.issueDate || '-'}</td>
                        <td><span class="badge ${badgeClass}">${i.status}</span></td>
                    `;
                    recentBody.appendChild(row);
                });
            } else {
                recentBody.innerHTML = '<tr><td colspan="6" class="text-center">No recent transactions recorded.</td></tr>';
            }
        }

        // Render Inventory Summary Table
        const invBody = document.getElementById('inventorySummaryTableBody');
        if (invBody) {
            invBody.innerHTML = '';
            if (data.inventorySummary && data.inventorySummary.length > 0) {
                data.inventorySummary.forEach(eq => {
                    const issued = eq.totalQuantity - eq.availableQuantity;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${escapeHtml(eq.name)}</strong></td>
                        <td><span class="badge badge-gray">${escapeHtml(eq.category)}</span></td>
                        <td>${eq.totalQuantity}</td>
                        <td style="font-weight: 700; color: #10b981;">${eq.availableQuantity}</td>
                        <td style="font-weight: 700; color: #f59e0b;">${issued}</td>
                    `;
                    invBody.appendChild(row);
                });
            } else {
                invBody.innerHTML = '<tr><td colspan="5" class="text-center">No equipment in inventory.</td></tr>';
            }
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
        showToast(err.message, 'error');
    }
}

// ========================================================
// 3. EQUIPMENT MANAGEMENT MODULE
// ========================================================
async function loadEquipmentData() {
    try {
        const res = await fetch(`${API_BASE}/equipment`);
        if (!res.ok) throw new Error('Failed to load equipment list.');
        cachedEquipment = await res.json();
        renderEquipmentTable(cachedEquipment);
    } catch (err) {
        console.error('Equipment error:', err);
        showToast(err.message, 'error');
    }
}

function filterEquipment() {
    const query = document.getElementById('equipmentSearchInput').value.toLowerCase().trim();
    const category = document.getElementById('equipmentCategoryFilter').value;

    const filtered = cachedEquipment.filter(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = category === 'All' || item.category === category;
        return matchesName && matchesCategory;
    });

    renderEquipmentTable(filtered);
}

function renderEquipmentTable(items) {
    const tbody = document.getElementById('equipmentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No equipment items found matching criteria.</td></tr>';
        return;
    }

    items.forEach(eq => {
        const row = document.createElement('tr');
        const availClass = eq.availableQuantity > 0 ? 'color: #10b981; font-weight: 800;' : 'color: #ef4444; font-weight: 800;';
        row.innerHTML = `
            <td>#${eq.id}</td>
            <td><strong>${escapeHtml(eq.name)}</strong></td>
            <td><span class="badge badge-blue">${escapeHtml(eq.category)}</span></td>
            <td>${eq.totalQuantity}</td>
            <td style="${availClass}">${eq.availableQuantity}</td>
            <td>${escapeHtml(eq.description || '-')}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editEquipment(${eq.id})">Edit</button>
                <button class="btn btn-danger-outline" onclick="deleteEquipment(${eq.id}, '${escapeHtml(eq.name)}')">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openEquipmentModal() {
    document.getElementById('equipmentIdHidden').value = '';
    document.getElementById('equipmentModalTitle').textContent = 'Add New Equipment';
    document.getElementById('saveEquipmentBtn').textContent = 'Save Equipment';
    document.getElementById('equipmentNameInput').value = '';
    document.getElementById('equipmentCategoryInput').value = 'Outdoor';
    document.getElementById('equipmentQuantityInput').value = 10;
    document.getElementById('equipmentDescInput').value = '';
    document.getElementById('equipmentModal').classList.add('active');
}

function closeEquipmentModal() {
    document.getElementById('equipmentModal').classList.remove('active');
}

function editEquipment(id) {
    const eq = cachedEquipment.find(item => item.id === id);
    if (!eq) return showToast('Equipment record not found. Refresh and try again.', 'error');
    document.getElementById('equipmentIdHidden').value = eq.id;
    document.getElementById('equipmentNameInput').value = eq.name || '';
    document.getElementById('equipmentCategoryInput').value = eq.category || 'Other';
    document.getElementById('equipmentQuantityInput').value = eq.totalQuantity;
    document.getElementById('equipmentDescInput').value = eq.description || '';
    document.getElementById('equipmentModalTitle').textContent = 'Edit Equipment / Total Stock';
    document.getElementById('saveEquipmentBtn').textContent = 'Update Equipment';
    document.getElementById('equipmentModal').classList.add('active');
}

async function handleSaveEquipment(e) {
    e.preventDefault();
    const name = document.getElementById('equipmentNameInput').value.trim();
    const category = document.getElementById('equipmentCategoryInput').value;
    const totalQuantity = parseInt(document.getElementById('equipmentQuantityInput').value, 10);
    const description = document.getElementById('equipmentDescInput').value.trim();

    if (!name) {
        showToast('Equipment name cannot be empty.', 'error');
        return;
    }
    if (isNaN(totalQuantity) || totalQuantity <= 0) {
        showToast('Total quantity must be greater than zero.', 'error');
        return;
    }

    const equipmentId = document.getElementById('equipmentIdHidden').value;
    const payload = {
        name,
        category,
        totalQuantity,
        availableQuantity: totalQuantity,
        description
    };

    try {
        const res = await fetch(equipmentId ? `${API_BASE}/equipment/${equipmentId}` : `${API_BASE}/equipment`, {
            method: equipmentId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Error saving equipment.');
        }

        showToast(equipmentId ? `Equipment '${name}' updated successfully!` : `Equipment '${name}' added successfully!`, 'success');
        closeEquipmentModal();
        loadEquipmentData();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteEquipment(id, name) {
    try {
        const res = await fetch(`${API_BASE}/equipment/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Cannot delete equipment because active borrowings exist.');
        }

        showToast(`Equipment '${name}' deleted successfully.`, 'success');
        loadEquipmentData();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ========================================================
// 4. STUDENT MANAGEMENT MODULE
// ========================================================
async function loadStudentsData() {
    try {
        const res = await fetch(`${API_BASE}/students`);
        if (!res.ok) throw new Error('Failed to load registered students.');
        cachedStudents = await res.json();
        renderStudentsTable(cachedStudents);
    } catch (err) {
        console.error('Students error:', err);
        showToast(err.message, 'error');
    }
}

function filterStudents() {
    const query = document.getElementById('studentSearchInput').value.toLowerCase().trim();
    const filtered = cachedStudents.filter(s => {
        return s.fullName.toLowerCase().includes(query) ||
               s.department.toLowerCase().includes(query) ||
               s.email.toLowerCase().includes(query);
    });
    renderStudentsTable(filtered);
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students registered or found matching search.</td></tr>';
        return;
    }

    students.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${s.id}</td>
            <td><strong>${escapeHtml(s.fullName)}</strong></td>
            <td><code style="color: #2563eb;">${escapeHtml(s.email)}</code></td>
            <td>${escapeHtml(s.phone)}</td>
            <td>${escapeHtml(s.department || '-')}</td>
            <td>${escapeHtml(s.classSemester || '-')}</td>
            <td>
                <button class="btn btn-danger-outline" onclick="deleteStudent(${s.id}, '${escapeHtml(s.fullName)}')">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openStudentModal() {
    document.getElementById('studentIdHidden').value = '';
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentEmailInput').value = '';
    document.getElementById('studentPhoneInput').value = '';
    document.getElementById('studentDeptInput').value = 'Computer Science Engineering';
    document.getElementById('studentSemInput').value = 'Semester 2';
    document.getElementById('studentModal').classList.add('active');
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('active');
}

async function handleSaveStudent(e) {
    e.preventDefault();
    const fullName = document.getElementById('studentNameInput').value.trim();
    const email = document.getElementById('studentEmailInput').value.trim();
    const phone = document.getElementById('studentPhoneInput').value.trim();
    const department = document.getElementById('studentDeptInput').value.trim();
    const classSemester = document.getElementById('studentSemInput').value.trim();

    if (!fullName || !email || !phone) {
        showToast('Name, Email, and Phone are required.', 'error');
        return;
    }

    const payload = { fullName, email, phone, department, classSemester };

    try {
        const res = await fetch(`${API_BASE}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Error registering student.');
        }

        showToast(`Student '${fullName}' registered successfully!`, 'success');
        closeStudentModal();
        loadStudentsData();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteStudent(id, name) {
    try {
        const res = await fetch(`${API_BASE}/students/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Cannot delete student with active borrowings.');
        }

        showToast(`Student '${name}' deleted successfully.`, 'success');
        loadStudentsData();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ========================================================
// 5. ISSUE EQUIPMENT MODULE
// ========================================================
async function loadIssueFormData() {
    try {
        const [studRes, equipRes] = await Promise.all([
            fetch(`${API_BASE}/students`),
            fetch(`${API_BASE}/equipment`)
        ]);

        if (studRes.ok) cachedStudents = await studRes.json();
        if (equipRes.ok) cachedEquipment = await equipRes.json();

        // Populate student select
        const studentSelect = document.getElementById('issueStudentSelect');
        studentSelect.innerHTML = '<option value="">-- Choose Registered Student --</option>';
        cachedStudents.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.fullName} (${s.email} - ${s.department})`;
            studentSelect.appendChild(opt);
        });

        // Populate equipment select
        const equipSelect = document.getElementById('issueEquipmentSelect');
        equipSelect.innerHTML = '<option value="">-- Choose Sports Equipment --</option>';
        cachedEquipment.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.name} [${eq.category}] - Avail: ${eq.availableQuantity}`;
            equipSelect.appendChild(opt);
        });

        updateStockPreview();
    } catch (err) {
        console.error('Error loading issue form options:', err);
    }
}

function updateStockPreview() {
    const equipSelect = document.getElementById('issueEquipmentSelect');
    const badge = document.getElementById('stockPreviewBadge');
    const qtyInput = document.getElementById('issueQuantityInput');
    if (!equipSelect || !badge) return;

    const equipId = parseInt(equipSelect.value, 10);
    const equip = cachedEquipment.find(e => e.id === equipId);

    if (equip) {
        badge.textContent = `${equip.availableQuantity} units available`;
        if (equip.availableQuantity > 0) {
            badge.style.backgroundColor = '#ecfdf5';
            badge.style.color = '#10b981';
            badge.style.borderColor = '#a7f3d0';
        } else {
            badge.textContent = 'Out of Stock (0 units)';
            badge.style.backgroundColor = '#fef2f2';
            badge.style.color = '#ef4444';
            badge.style.borderColor = '#fecaca';
        }
        if (qtyInput) {
            qtyInput.max = equip.availableQuantity;
        }
    } else {
        badge.textContent = 'Select equipment to check stock';
        badge.style.backgroundColor = '#f1f5f9';
        badge.style.color = '#64748b';
        badge.style.borderColor = '#e2e8f0';
    }
}

async function handleIssueEquipment(e) {
    e.preventDefault();
    const studentId = parseInt(document.getElementById('issueStudentSelect').value, 10);
    const equipmentId = parseInt(document.getElementById('issueEquipmentSelect').value, 10);
    const quantity = parseInt(document.getElementById('issueQuantityInput').value, 10);
    const issueDate = document.getElementById('issueDateInput').value;
    const dueDate = document.getElementById('issueDueDateInput').value;

    if (isNaN(studentId) || isNaN(equipmentId)) {
        showToast('Please select both a student and equipment.', 'error');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showToast('Quantity must be greater than zero.', 'error');
        return;
    }

    if (!dueDate || dueDate < issueDate) { showToast('Return due date must be on or after issue date.', 'error'); return; }
    const payload = { studentId, equipmentId, quantity, issueDate, dueDate };

    try {
        const res = await fetch(`${API_BASE}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Failed to issue equipment.');
        }

        showToast('Equipment issued successfully! Stock updated in MySQL.', 'success');
        document.getElementById('issueQuantityInput').value = 1;
        loadIssueFormData(); // reload available quantities in dropdown
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ========================================================
// 6. RETURN EQUIPMENT MODULE (RESPONSIVE)
// ========================================================
async function loadActiveIssuesData() {
    try {
        const statusFilter = document.getElementById('returnStatusFilter')?.value || 'ISSUED';
        const endpoint = statusFilter === 'ALL' ? `${API_BASE}/issues` : `${API_BASE}/issues/active`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to load borrowings.');
        cachedActiveIssues = await res.json();

        // Also fetch active count if in ALL view
        const activeCount = cachedActiveIssues.filter(i => i.status === 'ISSUED').length;
        const countBadge = document.getElementById('activeLoansCountBadge');
        if (countBadge) {
            countBadge.textContent = `${activeCount} Pending Return`;
        }

        filterActiveIssues();
    } catch (err) {
        console.error('Active issues error:', err);
        showToast(err.message, 'error');
    }
}

function filterActiveIssues() {
    const search = document.getElementById('returnSearchInput')?.value.trim().toLowerCase() || '';
    const filtered = cachedActiveIssues.filter(issue => {
        if (!search) return true;
        const student = (issue.student?.fullName || '').toLowerCase();
        const equip = (issue.equipment?.name || '').toLowerCase();
        const id = String(issue.id || '');
        return student.includes(search) || equip.includes(search) || id.includes(search);
    });

    renderActiveIssuesCards(filtered);
    renderActiveIssuesTable(filtered);
}

function renderActiveIssuesCards(issues) {
    const container = document.getElementById('activeIssuesCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (issues.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: #64748b; font-size: 13px;">No borrowed equipment pending return. All inventory is accounted for!</div>';
        return;
    }

    issues.forEach(issue => {
        const isIssued = issue.status === 'ISSUED';
        const card = document.createElement('div');
        card.className = `return-card ${isIssued ? 'pending' : 'returned'}`;
        card.innerHTML = `
            <div>
                <div class="return-card-header">
                    <span class="loan-id-badge">Loan #${issue.id}</span>
                    <span class="badge ${isIssued ? 'badge-amber' : 'badge-green'}">${isIssued ? '⏳ Pending Return' : '✓ Returned'}</span>
                </div>
                <div class="return-card-body">
                    <div class="return-equip-name">⚽ ${escapeHtml(issue.equipment?.name || '-')}</div>
                    <div class="return-qty-badge">${issue.quantity} unit(s) borrowed</div>
                    <div class="borrower-box">
                        <div class="borrower-name">🎓 ${escapeHtml(issue.student?.fullName || '-')}</div>
                        <div class="borrower-dates">
                            <span>Issued: ${issue.issueDate || '-'}</span>
                            <span>Due: ${issue.dueDate || 'Not set'}</span>
                            <span style="font-weight:700;color:${issue.fineAmount > 0 ? '#dc2626' : '#059669'}">Fine: ₹${issue.fineAmount || 0} (${issue.overdueDays || 0} day(s) late)</span>
                            ${!isIssued && issue.returnDate ? `<span>Returned: ${issue.returnDate}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="return-card-footer">
                ${isIssued ? `
                    <button class="btn-return-action" onclick="returnEquipment(${issue.id}, '${escapeHtml(issue.equipment?.name || '')}', ${issue.quantity}, '${escapeHtml(issue.student?.fullName || '')}')">
                        ↩ Return & Replenish Stock
                    </button>
                ` : `
                    <div style="text-align: center; font-size: 12px; color: #64748b; font-style: italic; padding: 6px;">
                        Completed (${issue.returnDate || 'Returned'})
                    </div>
                `}
            </div>
        `;
        container.appendChild(card);
    });
}

function renderActiveIssuesTable(issues) {
    const tbody = document.getElementById('activeIssuesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px;">No equipment records found matching search.</td></tr>';
        return;
    }

    issues.forEach(issue => {
        const isIssued = issue.status === 'ISSUED';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${issue.id}</strong></td>
            <td><strong>${escapeHtml(issue.student?.fullName || '-')}</strong></td>
            <td>${escapeHtml(issue.equipment?.name || '-')}</td>
            <td><span style="font-weight: 800;">${issue.quantity}</span></td>
            <td>${issue.issueDate || '-'}<br><small>Due: ${issue.dueDate || '-'}</small></td>
            <td><span class="badge ${isIssued ? 'badge-amber' : 'badge-green'}">${issue.status}</span></td>
            <td>
                ${isIssued ? `
                    <button class="btn btn-success btn-sm" onclick="returnEquipment(${issue.id}, '${escapeHtml(issue.equipment?.name || '')}', ${issue.quantity}, '${escapeHtml(issue.student?.fullName || '')}')">
                        ↩ Return
                    </button>
                ` : `
                    <span style="color: #64748b; font-size: 11px; font-style: italic;">Returned</span>
                `}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function returnEquipment(issueId, equipName, quantity, studentName) {
    try {
        const res = await fetch(`${API_BASE}/issues/${issueId}/return`, {
            method: 'PUT'
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Failed to process return.');
        }

        showToast(`Equipment '${equipName}' returned! Stock replenished in database.`, 'success');
        loadActiveIssuesData();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ========================================================
// Fine Management (₹5 per overdue calendar day)
// ========================================================
async function loadFineData() {
    const tbody = document.getElementById('fineTableBody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE}/issues`);
        if (!res.ok) throw new Error('Unable to load fine records.');
        const issues = await res.json();
        tbody.innerHTML = '';
        if (!issues.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No borrowing records yet.</td></tr>';
            return;
        }
        issues.forEach(issue => {
            const fine = Number(issue.fineAmount || 0);
            const row = document.createElement('tr');
            row.innerHTML = `<td>#${issue.id}</td><td>${escapeHtml(issue.student?.fullName || '-')}</td><td>${escapeHtml(issue.equipment?.name || '-')}</td><td>${issue.dueDate || 'Not set'}</td><td><span class="badge ${issue.status === 'ISSUED' ? 'badge-amber' : 'badge-green'}">${escapeHtml(issue.status || '-')}</span></td><td>${issue.overdueDays || 0}</td><td style="font-weight:800;color:${fine > 0 ? '#dc2626' : '#059669'}">₹${fine}</td>`;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">${escapeHtml(err.message)}</td></tr>`;
    }
}

// ========================================================
// Utilities
// ========================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
