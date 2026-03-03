// medication-form.js - Updated with proper save functionality
window.medicationForm = {
    open: function(medicationData = null) {
        const isEditing = medicationData !== null;
        
        const formContent = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="text-center">
                    <div class="w-16 h-16 ${isEditing ? 'bg-yellow-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas ${isEditing ? 'fa-edit text-yellow-500' : 'fa-pills text-blue-500'} text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800">${isEditing ? 'Edit Medication' : 'Add New Medication'}</h3>
                    <p class="text-gray-600 mt-2">${isEditing ? 'Update your medication details' : 'Fill in the details for your medication'}</p>
                </div>
                
                <!-- Form -->
                <div class="space-y-4">
                    <!-- Medication Name -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Medication Name <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="form-med-name" 
                               value="${medicationData?.name || ''}"
                               placeholder="e.g., Metformin, Lisinopril"
                               class="medication-input w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                    </div>
                    
                    <!-- Dosage and Frequency -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Dosage <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="form-med-dosage" 
                                   value="${medicationData?.dosage || ''}"
                                   placeholder="e.g., 500mg, 1 tablet"
                                   class="medication-input w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Frequency <span class="text-red-500">*</span>
                            </label>
                            <select id="form-med-frequency" 
                                    class="medication-input w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                                <option value="daily" ${(medicationData?.frequency || 'daily') === 'daily' ? 'selected' : ''}>Daily</option>
                                <option value="twice-daily" ${medicationData?.frequency === 'twice-daily' ? 'selected' : ''}>Twice Daily</option>
                                <option value="weekly" ${medicationData?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="monthly" ${medicationData?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                <option value="as-needed" ${medicationData?.frequency === 'as-needed' ? 'selected' : ''}>As Needed</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Time -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Time <span class="text-red-500">*</span>
                        </label>
                        <input type="time" id="form-med-time" 
                               value="${medicationData?.time || '08:00'}"
                               class="medication-input w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                    </div>
                    
                    <!-- Notes -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Additional Notes
                        </label>
                        <textarea id="form-med-notes" rows="3" 
                                  placeholder="Any special instructions, side effects to watch for, etc."
                                  class="medication-input w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">${medicationData?.notes || ''}</textarea>
                    </div>
                </div>
                
                <!-- Form Actions -->
                <div class="flex space-x-4 pt-4">
                    <button onclick="window.modal.close()" 
                            class="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onclick="window.medicationForm.saveMedication(${isEditing ? JSON.stringify(medicationData?.id) : 'null'})" 
                            class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition shadow-lg">
                        <i class="fas fa-save mr-2"></i> ${isEditing ? 'Update' : 'Save'} Medication
                    </button>
                </div>
            </div>
        `;
        
        window.modal.open(formContent, {
            title: isEditing ? 'Edit Medication' : 'Add Medication',
            size: 'lg'
        });
    },
    
    saveMedication: async function(medicationId = null) {
        // Gather form data
        const name = document.getElementById('form-med-name').value.trim();
        const dosage = document.getElementById('form-med-dosage').value.trim();
        const frequency = document.getElementById('form-med-frequency').value;
        const time = document.getElementById('form-med-time').value;
        const notes = document.getElementById('form-med-notes').value.trim();
        
        // Validate
        if (!name || !dosage || !time) {
            window.notify.warning('Please fill in all required fields (Name, Dosage, Time)');
            return;
        }
        
        try {
            // Show loading
            const saveBtn = document.querySelector('.modal-content button:last-child');
            const originalText = saveBtn ? saveBtn.innerHTML : '';
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
                saveBtn.disabled = true;
            }
            
            // Prepare medication data
            const medicationData = {
                name,
                dosage,
                frequency,
                time,
                notes: notes || ''
            };
            
            // Save to database
            let result;
            if (medicationId) {
                // Update existing medication
                result = window.medicationDB.update(medicationId, medicationData);
                if (result) {
                    window.notify.success('Medication updated successfully!');
                }
            } else {
                // Add new medication
                result = window.medicationDB.add(medicationData);
                if (result) {
                    window.notify.success('Medication added successfully!');
                }
            }
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (result) {
                // Close modal
                window.modal.close();
                
                // Refresh medications list
                if (typeof window.medications !== 'undefined' && typeof window.medications.load === 'function') {
                    window.medications.load();
                }
            } else {
                throw new Error('Failed to save medication');
            }
            
        } catch (error) {
            console.error('Save error:', error);
            window.notify.error('Error saving medication: ' + error.message);
        } finally {
            // Restore button
            const saveBtn = document.querySelector('.modal-content button:last-child');
            if (saveBtn) {
                saveBtn.innerHTML = medicationId ? '<i class="fas fa-save mr-2"></i> Update Medication' : '<i class="fas fa-save mr-2"></i> Save Medication';
                saveBtn.disabled = false;
            }
        }
    }
};