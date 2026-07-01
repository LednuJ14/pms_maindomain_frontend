import React, { useState } from 'react';

const PreQualificationWizard = ({ property, unit, onSubmit, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    income_bracket: '',
    employment_status: '',
    has_pets: false,
    move_in_date: '',
    schedule_viewing: false,
    scheduled_at: ''
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    onSubmit({
      pre_qualification: {
        income_bracket: formData.income_bracket,
        employment_status: formData.employment_status,
        has_pets: formData.has_pets,
        move_in_date: formData.move_in_date
      },
      viewing_schedule: formData.schedule_viewing ? {
        scheduled_at: formData.scheduled_at
      } : null
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-60" onClick={onCancel}></div>
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pre-Qualification Form</h2>
            <p className="text-sm text-gray-500 mt-1">
              {property?.title} {unit ? `- ${unit.unitName}` : ''}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`text-xs font-medium ${step >= i ? 'text-black' : 'text-gray-400'}`}>
                  Step {i}
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black transition-all duration-300 ease-in-out"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step 1: Financial */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                  value={formData.employment_status}
                  onChange={e => setFormData({...formData, employment_status: e.target.value})}
                >
                  <option value="">Select Status</option>
                  <option value="employed_full_time">Employed (Full-Time)</option>
                  <option value="employed_part_time">Employed (Part-Time)</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income Bracket</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                  value={formData.income_bracket}
                  onChange={e => setFormData({...formData, income_bracket: e.target.value})}
                >
                  <option value="">Select Bracket</option>
                  <option value="under_30k">Under ₱30,000</option>
                  <option value="30k_50k">₱30,000 - ₱50,000</option>
                  <option value="50k_100k">₱50,000 - ₱100,000</option>
                  <option value="over_100k">Over ₱100,000</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Logistics */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-semibold mb-4">Move-in Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Move-in Date</label>
                <input 
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                  value={formData.move_in_date}
                  onChange={e => setFormData({...formData, move_in_date: e.target.value})}
                />
              </div>
              <div className="flex items-center mt-4">
                <input 
                  type="checkbox"
                  id="has_pets"
                  className="h-5 w-5 text-black border-gray-300 rounded focus:ring-black"
                  checked={formData.has_pets}
                  onChange={e => setFormData({...formData, has_pets: e.target.checked})}
                />
                <label htmlFor="has_pets" className="ml-3 block text-sm font-medium text-gray-700">
                  I will be bringing pets
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Viewing */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-semibold mb-4">Schedule a Viewing</h3>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to schedule a viewing before submitting your inquiry? This helps fast-track your application.
              </p>
              
              <div className="flex items-center mb-4">
                <input 
                  type="checkbox"
                  id="schedule_viewing"
                  className="h-5 w-5 text-black border-gray-300 rounded focus:ring-black"
                  checked={formData.schedule_viewing}
                  onChange={e => setFormData({...formData, schedule_viewing: e.target.checked})}
                />
                <label htmlFor="schedule_viewing" className="ml-3 block text-sm font-medium text-gray-700">
                  Yes, I'd like to schedule a viewing
                </label>
              </div>

              {formData.schedule_viewing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date & Time</label>
                  <input 
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                    value={formData.scheduled_at}
                    onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    The property manager will confirm this schedule with you shortly.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={step === 1 ? onCancel : prevStep}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 3 ? (
            <button
              onClick={nextStep}
              disabled={(step === 1 && (!formData.income_bracket || !formData.employment_status)) || 
                        (step === 2 && !formData.move_in_date)}
              className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={formData.schedule_viewing && !formData.scheduled_at}
              className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Submit Inquiry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreQualificationWizard;
