import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const TenantContractModal = ({ isOpen, onClose, inquiry, onContractSigned }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && inquiry) {
      loadContract();
    }
  }, [isOpen, inquiry]);

  const loadContract = async () => {
    if (!inquiry?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTenantContractByInquiry(inquiry.id);
      if (response?.contract) {
        setContract(response.contract);
      } else {
        setContract(null);
      }
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError(err?.data?.message || 'Failed to load contract');
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!contract?.id) return;

    try {
      setSigning(true);
      setError(null);
      
      const response = await api.signContractAsTenant(contract.id);
      
      if (response?.contract) {
        setContract(response.contract);
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
              {contract ? `Contract #${contract.contract_number}` : 'No contract available'}
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
          ) : !contract ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No contract has been created yet. Please wait for the property manager to create a contract.</p>
            </div>
          ) : (
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
                  <p className="font-medium text-black">{contract.contract_type === 'quarterly' ? 'Quarterly (6 months)' : 'Yearly (12 months)'}</p>
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
                      <p className="font-medium text-gray-900">You (Tenant)</p>
                      <p className="text-sm text-gray-600">
                        {contract.tenant_signed ? (
                          <span className="text-green-600">✓ Signed on {contract.tenant_signed_date ? new Date(contract.tenant_signed_date).toLocaleDateString() : 'N/A'}</span>
                        ) : (
                          <span className="text-yellow-600">Pending your signature</span>
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
                      <p className="font-medium text-gray-900">Landlord</p>
                      <p className="text-sm text-gray-600">
                        {contract.landlord_signed ? (
                          <span className="text-green-600">✓ Signed on {contract.landlord_signed_date ? new Date(contract.landlord_signed_date).toLocaleDateString() : 'N/A'}</span>
                        ) : (
                          <span className="text-yellow-600">Pending landlord signature</span>
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
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {!contract.tenant_signed && (
                  <button
                    onClick={handleSignContract}
                    disabled={signing}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signing ? 'Signing...' : 'Sign Contract'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantContractModal;

