'use client';

import { useState, useEffect } from 'react';

export default function RecipientSelector({ selectedRecipients, onRecipientsChange, type = 'broadcast' }) {
    const [mode, setMode] = useState('individual');
    const [individualInput, setIndividualInput] = useState('');
    const [databaseRecipients, setDatabaseRecipients] = useState([]);
    const [selectedDbRecipients, setSelectedDbRecipients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cohortGroups, setCohortGroups] = useState({});
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [groupLoading, setGroupLoading] = useState(false);

    // Fetch users and organize by cohort
    const fetchDatabaseRecipients = async () => {
        setLoading(true);
        try {
            const endpoint = type === 'birthday' 
                ? '/api/emails?type=birthday-recipients'
                : '/api/emails?type=recipients';
            const response = await fetch(endpoint);
            const data = await response.json();
            
            const users = data.recipients || [];
            setDatabaseRecipients(users);
            
            // Organize users by cohort year
            const groups = {};
            users.forEach(user => {
                const cohort = user.cohortYear || 'Unknown';
                if (!groups[cohort]) {
                    groups[cohort] = [];
                }
                groups[cohort].push(user);
            });
            setCohortGroups(groups);
            
            // Pre-select any that are already in selectedRecipients
            const preSelected = users
                .filter(r => selectedRecipients.includes(r.email))
                .map(r => r.email) || [];
            setSelectedDbRecipients(preSelected);
        } catch (error) {
            console.error('Error fetching recipients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'database') {
            fetchDatabaseRecipients();
        }
    }, [mode, type]);

    // Get current year for cohort display
    const currentYear = new Date().getFullYear();
    const cohortYears = Object.keys(cohortGroups).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return parseInt(b) - parseInt(a);
    });

    // Toggle entire cohort group
    const toggleGroup = (cohortYear) => {
        const groupEmails = cohortGroups[cohortYear].map(user => user.email);
        const allSelected = groupEmails.every(email => selectedDbRecipients.includes(email));
        
        let newSelection;
        let newGroupSelection;
        
        if (allSelected) {
            // Remove all from this cohort
            newSelection = selectedDbRecipients.filter(email => !groupEmails.includes(email));
            newGroupSelection = selectedGroups.filter(g => g !== cohortYear);
        } else {
            // Add all from this cohort
            const toAdd = groupEmails.filter(email => !selectedDbRecipients.includes(email));
            newSelection = [...selectedDbRecipients, ...toAdd];
            newGroupSelection = [...selectedGroups, cohortYear];
        }
        
        setSelectedDbRecipients(newSelection);
        setSelectedGroups(newGroupSelection);
        
        // Update main recipients list
        const otherRecipients = selectedRecipients.filter(
            r => !databaseRecipients.some(db => db.email === r)
        );
        onRecipientsChange([...otherRecipients, ...newSelection]);
    };

    // Get cohort statistics
    const getCohortStats = (cohortYear) => {
        const users = cohortGroups[cohortYear] || [];
        const selected = users.filter(user => selectedDbRecipients.includes(user.email));
        return { total: users.length, selected: selected.length };
    };

    // Select all active users (excluding Unknown/graduated)
    const selectAllActive = () => {
        const activeCohorts = cohortYears.filter(y => y !== 'Unknown');
        const allEmails = activeCohorts.flatMap(y => cohortGroups[y].map(u => u.email));
        const newSelection = [...new Set([...selectedDbRecipients, ...allEmails])];
        setSelectedDbRecipients(newSelection);
        setSelectedGroups(activeCohorts);
        
        const otherRecipients = selectedRecipients.filter(
            r => !databaseRecipients.some(db => db.email === r)
        );
        onRecipientsChange([...otherRecipients, ...newSelection]);
    };

    // Deselect all
    const deselectAll = () => {
        setSelectedDbRecipients([]);
        setSelectedGroups([]);
        
        const otherRecipients = selectedRecipients.filter(
            r => !databaseRecipients.some(db => db.email === r)
        );
        onRecipientsChange(otherRecipients);
    };

    // ... existing handlers ...

    const toggleDatabaseRecipient = (email) => {
        const newSelection = selectedDbRecipients.includes(email)
            ? selectedDbRecipients.filter(e => e !== email)
            : [...selectedDbRecipients, email];

        setSelectedDbRecipients(newSelection);
        
        // Update group selection state
        const updatedGroups = [];
        Object.keys(cohortGroups).forEach(cohort => {
            const groupEmails = cohortGroups[cohort].map(u => u.email);
            const allSelected = groupEmails.every(e => newSelection.includes(e));
            if (allSelected && groupEmails.length > 0) {
                updatedGroups.push(cohort);
            }
        });
        setSelectedGroups(updatedGroups);
        
        // Update main recipients list
        const otherRecipients = selectedRecipients.filter(
            r => !databaseRecipients.some(db => db.email === r)
        );
        onRecipientsChange([...otherRecipients, ...newSelection]);
    };

    const removeRecipient = (email) => {
        onRecipientsChange(selectedRecipients.filter(e => e !== email));
        setSelectedDbRecipients(selectedDbRecipients.filter(e => e !== email));
    };

    const filteredDbRecipients = databaseRecipients.filter(r =>
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Calculate total stats
    const totalUsers = databaseRecipients.length;
    const totalSelected = selectedDbRecipients.length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setMode('individual')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mode === 'individual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Individual
                </button>
                <button
                    type="button"
                    onClick={() => setMode('csv')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mode === 'csv'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Upload CSV
                </button>
                <button
                    type="button"
                    onClick={() => setMode('database')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mode === 'database'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    From Database
                </button>
            </div>

            {mode === 'individual' && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={individualInput}
                            onChange={(e) => setIndividualInput(e.target.value)}
                            placeholder="Enter emails separated by ; (e.g., a@b.com;c@d.com)"
                            className="flex-1 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const emails = individualInput
                                    .split(';')
                                    .map(email => email.trim())
                                    .filter(email => email && email.includes('@'));
                                if (emails.length > 0) {
                                    const existingEmails = new Set(selectedRecipients);
                                    emails.forEach(email => existingEmails.add(email));
                                    onRecipientsChange(Array.from(existingEmails));
                                    setIndividualInput('');
                                }
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                            Add
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Separate multiple emails with semicolon (;)
                    </p>
                </div>
            )}

            {mode === 'csv' && (
                <div className="space-y-2">
                    <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const text = event.target.result;
                                const lines = text.split('\n');
                                const emails = lines
                                    .map(line => line.trim())
                                    .filter(line => line && line.includes('@'));
                                if (emails.length > 0) {
                                    const existingEmails = new Set(selectedRecipients);
                                    emails.forEach(email => existingEmails.add(email));
                                    onRecipientsChange(Array.from(existingEmails));
                                }
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500">
                        Upload CSV or TXT file with email addresses (one per line)
                    </p>
                </div>
            )}

            {mode === 'database' && (
                <div className="space-y-3">
                    {/* Cohort Group Selection */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">📚 Cohort Groups</h4>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllActive}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAll}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {cohortYears.map((cohort) => {
                                const stats = getCohortStats(cohort);
                                const isSelected = selectedGroups.includes(cohort);
                                const isAllSelected = stats.selected === stats.total && stats.total > 0;
                                const isPartialSelected = stats.selected > 0 && stats.selected < stats.total;
                                
                                return (
                                    <button
                                        key={cohort}
                                        type="button"
                                        onClick={() => toggleGroup(cohort)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            isAllSelected
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : isPartialSelected
                                                    ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        }`}
                                    >
                                        {cohort === 'Unknown' ? '❓ Unknown' : `📅 ${cohort}`}
                                        <span className="ml-1 opacity-75">
                                            ({stats.selected}/{stats.total})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>👥 Total: {totalUsers} users</span>
                            <span>✅ Selected: {totalSelected} users</span>
                        </div>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search recipients by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {/* Individual User List */}
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                        {loading ? (
                            <div className="text-center text-gray-500 py-4">Loading recipients...</div>
                        ) : filteredDbRecipients.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">
                                {searchTerm ? 'No matching recipients found' : 'No recipients found in database'}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredDbRecipients.map((recipient) => (
                                    <label key={recipient.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedDbRecipients.includes(recipient.email)}
                                            onChange={() => toggleDatabaseRecipient(recipient.email)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm flex-1">
                                            {recipient.name && <span className="font-medium text-gray-600">{recipient.name}</span>}
                                            <span className={recipient.name ? 'text-gray-500' : ''}>
                                                {recipient.name ? ` (${recipient.email})` : recipient.email}
                                            </span>
                                            {type === 'birthday' && recipient.birthday && (
                                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                    🎂 {new Date(recipient.birthday).toLocaleDateString()}
                                                </span>
                                            )}
                                            {recipient.cohortYear && (
                                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    📅 {recipient.cohortYear}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedRecipients.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Selected Recipients:</h4>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {selectedRecipients.map((email) => (
                            <span
                                key={email}
                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                            >
                                {email}
                                <button
                                    type="button"
                                    onClick={() => removeRecipient(email)}
                                    className="hover:text-blue-600 ml-1 focus:outline-none"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        {selectedRecipients.length} recipient(s) selected
                    </p>
                </div>
            )}
        </div>
    );
}