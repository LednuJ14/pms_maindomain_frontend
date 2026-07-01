import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import api from '../../services/api';

const ContractModal = ({ isOpen, onClose, inquiry, unit, onContractCreated, onContractSigned }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const sigPad = useRef({});

  const clearSignature = () => {
    sigPad.current.clear();
  };
  
  // Form state
  const [contractType, setContractType] = useState('quarterly');
  const [startDate, setStartDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [specialConditions, setSpecialConditions] = useState('');

  useEffect(() => {
    if (isOpen && inquiry) {
      loadContract();
      // Set default start date to today
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      // Fetch unit details to get monthly_rent and security_deposit
      fetchUnitDetails();
    }
  }, [isOpen, inquiry]);

  const fetchUnitDetails = async () => {
    // Try to get property_id and unit_id from inquiry object
    const propertyId = inquiry?.property_id || inquiry?.propertyId;
    const unitId = inquiry?.unit_id || inquiry?.unitId;
    
    if (!propertyId || !unitId) {
      // Fallback to unit prop if available
      if (unit?.monthly_rent) {
        setMonthlyRent(unit.monthly_rent.toString());
      }
      if (unit?.security_deposit) {
        setSecurityDeposit(unit.security_deposit.toString());
      }
      return;
    }
    
    try {
      // Fetch units for the property
      const unitsResponse = await api.listUnits(propertyId);
      if (unitsResponse?.units) {
        const unitData = unitsResponse.units.find(u => u.id === unitId);
        if (unitData) {
          // Set monthly rent from unit
          if (unitData.monthly_rent || unitData.price) {
            const rentValue = unitData.monthly_rent || unitData.price || 0;
            setMonthlyRent(rentValue.toString());
          }
          // Set security deposit from unit
          if (unitData.security_deposit) {
            setSecurityDeposit(unitData.security_deposit.toString());
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch unit details:', err);
      // Fallback to unit prop if available
      if (unit?.monthly_rent) {
        setMonthlyRent(unit.monthly_rent.toString());
      }
      if (unit?.security_deposit) {
        setSecurityDeposit(unit.security_deposit.toString());
      }
    }
  };

  const loadContract = async () => {
    if (!inquiry?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.getContractByInquiry(inquiry.id);
      if (response?.contract) {
        setContract(response.contract);
        setShowCreateForm(false);
        setIsEditing(false);
        // Populate form fields with contract data for editing
        if (response.contract) {
          setContractType(response.contract.contract_type || 'quarterly');
          setStartDate(response.contract.start_date ? response.contract.start_date.split('T')[0] : '');
          setMonthlyRent(response.contract.monthly_rent ? response.contract.monthly_rent.toString() : '');
          setSecurityDeposit(response.contract.security_deposit ? response.contract.security_deposit.toString() : '');
          setTermsAndConditions(response.contract.terms_and_conditions || '');
          setSpecialConditions(response.contract.special_conditions || '');
        }
      } else {
        setContract(null);
        setShowCreateForm(true);
      }
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError(err?.data?.message || 'Failed to load contract');
      setContract(null);
      setShowCreateForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    
    if (!inquiry?.id || !unit?.id) {
      setError('Missing inquiry or unit information');
      return;
    }

    if (!startDate || !monthlyRent) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const contractData = {
        inquiry_id: inquiry.id,
        unit_id: unit.id,
        contract_type: contractType,
        start_date: startDate,
        monthly_rent: parseFloat(monthlyRent),
        security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
        terms_and_conditions: termsAndConditions || null,
        special_conditions: specialConditions || null
      };

      const response = await api.createContract(contractData);
      
      if (response?.contract) {
        setContract(response.contract);
        setShowCreateForm(false);
        if (onContractCreated) {
          onContractCreated(response.contract);
        }
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      setError(err?.data?.message || 'Failed to create contract');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateContract = async (e) => {
    e.preventDefault();
    
    if (!contract?.id) {
      setError('Contract ID is missing');
      return;
    }

    if (!startDate || !monthlyRent) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      
      const contractData = {
        contract_type: contractType,
        start_date: startDate,
        monthly_rent: parseFloat(monthlyRent),
        security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
        terms_and_conditions: termsAndConditions || null,
        special_conditions: specialConditions || null
      };

      const response = await api.updateContract(contract.id, contractData);
      
      if (response?.contract) {
        setContract(response.contract);
        setIsEditing(false);
        if (onContractCreated) {
          onContractCreated(response.contract);
        }
      }
    } catch (err) {
      console.error('Failed to update contract:', err);
      setError(err?.data?.message || 'Failed to update contract');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignContract = async () => {
    if (!contract?.id) return;

    try {
      if (sigPad.current.isEmpty()) {
        setError('Please provide your signature.');
        return;
      }
      
      setSigning(true);
      setError(null);
      
      const signature_base64 = sigPad.current.getCanvas().toDataURL('image/png');
      
      const response = await api.signContractAsLandlord(contract.id, { signature_base64 });
      
      if (response?.contract) {
        setContract(response.contract);
        setShowSignaturePad(false);
        if (onContractSigned) {
          onContractSigned(response.contract);
        }
      }
    } catch (err) {
      console.error('Failed to sign contract:', err);
      setError(err?.data?.message || 'Failed to sign contract');
    } finally {
      setSigning(false);
    }
  };

  if (!isOpen) return null;

  const isFullySigned = contract?.tenant_signed && contract?.landlord_signed;
  const isActive = contract?.status === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-black bg-opacity-50 fixed inset-0" onClick={onClose}></div>
      
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rental Contract</h2>
            <p className="text-sm text-gray-600 mt-1">
              {contract ? `Contract #${contract.contract_number}` : 'Create new rental contract'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contract...</p>
            </div>
          ) : error && !contract ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          ) : showCreateForm && !contract ? (
            /* Create Contract Form */
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  required
                >
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="yearly">Yearly (12 months)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms and Conditions
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="Enter contract terms and conditions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Conditions
                </label>
                <textarea
                  value={specialConditions}
                  onChange={(e) => setSpecialConditions(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="Enter any special conditions..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          ) : contract && isEditing ? (
            /* Edit Contract Form */
            <form onSubmit={handleUpdateContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  required
                >
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="yearly">Yearly (12 months)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms and Conditions
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="Enter contract terms and conditions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Conditions
                </label>
                <textarea
                  value={specialConditions}
                  onChange={(e) => setSpecialConditions(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="Enter any special conditions..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Contract'}
                </button>
              </div>
            </form>
          ) : contract ? (
            /* Contract Details */
            <div className="space-y-4">
              {/* Contract Status */}
              <div className={`p-4 rounded-lg ${
                isActive ? 'bg-green-50 border border-green-200' :
                isFullySigned ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-black">
                      {isActive ? '✓ Contract Active' : 
                       isFullySigned ? '✓ Contract Signed' : 
                       'Contract Pending Signatures'}
                    </p>
                    <p className="text-sm text-black mt-1">
                      Contract #{contract.contract_number}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isActive ? 'bg-green-500 text-white' :
                    isFullySigned ? 'bg-blue-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}>
                    {contract.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Contract Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-black">Contract Type</p>
                  <p className="font-medium text-black">{contract.contract_type === 'quarterly' ? 'Quarterly (3 months)' : 'Yearly (12 months)'}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Duration</p>
                  <p className="font-medium text-black">{contract.duration_months} months</p>
                </div>
                <div>
                  <p className="text-sm text-black">Start Date</p>
                  <p className="font-medium text-black">{contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-black">End Date</p>
                  <p className="font-medium text-black">{contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Monthly Rent</p>
                  <p className="font-medium text-black">₱{parseFloat(contract.monthly_rent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Security Deposit</p>
                  <p className="font-medium text-black">₱{parseFloat(contract.security_deposit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              {/* Signatures */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Signatures</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Tenant</p>
                      <p className="text-sm text-gray-600">
                        {contract.tenant_signed ? (
                          <span className="text-green-600">✓ Signed on {contract.tenant_signed_date ? new Date(contract.tenant_signed_date).toLocaleDateString() : 'N/A'}</span>
                        ) : (
                          <span className="text-yellow-600">Pending signature</span>
                        )}
                      </p>
                    </div>
                    {contract.tenant_signed && (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Landlord (You)</p>
                      <p className="text-sm text-gray-600">
                        {contract.landlord_signed ? (
                          <span className="text-green-600">✓ Signed on {contract.landlord_signed_date ? new Date(contract.landlord_signed_date).toLocaleDateString() : 'N/A'}</span>
                        ) : (
                          <span className="text-yellow-600">Pending signature</span>
                        )}
                      </p>
                    </div>
                    {contract.landlord_signed && (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms */}
              {contract.terms_and_conditions && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Terms and Conditions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.terms_and_conditions}</p>
                </div>
              )}

              {contract.special_conditions && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Special Conditions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.special_conditions}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
                >
                  Close
                </button>
                {/* Show Edit button if contract can be edited (draft status or neither party signed) */}
                {contract.status === 'draft' && !contract.tenant_signed && !contract.landlord_signed && !showSignaturePad && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Contract
                  </button>
                )}
                {!contract.landlord_signed && !showSignaturePad && (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Review and Sign
                  </button>
                )}
              </div>

              {/* Signature Pad */}
              {showSignaturePad && !contract.landlord_signed && (
                <div className="border-t pt-4 mt-4 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Please sign below</h3>
                  <div className="border-2 border-dashed border-gray-300 bg-white rounded-lg">
                    <SignatureCanvas 
                      penColor="black"
                      canvasProps={{width: 500, height: 200, className: 'sigCanvas max-w-full'}}
                      ref={sigPad}
                    />
                  </div>
                  <div className="flex justify-between mt-4">
                    <button 
                      onClick={clearSignature}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Clear Signature
                    </button>
                    <div className="space-x-3">
                      <button
                        onClick={() => setShowSignaturePad(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSignContract}
                        disabled={signing}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {signing ? 'Submitting...' : 'Confirm Signature'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ContractModal;
