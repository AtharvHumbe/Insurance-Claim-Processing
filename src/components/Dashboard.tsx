import React from 'react';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Claim {
  id: string;
  patient_name: string;
  diagnosis: string;
  treatment: string;
  cost: number;
  status: string;
  created_at: string;
}

export function Dashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [newClaim, setNewClaim] = useState({
    patient_name: '',
    diagnosis: '',
    treatment: '',
    cost: 0,
    document: null as File | null,
  });

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      toast.error('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // First, upload the document if it exists
      let document_url = null;
      if (newClaim.document) {
        const fileExt = newClaim.document.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('claim-documents')
          .upload(fileName, newClaim.document);

        if (uploadError) throw uploadError;
        document_url = data.path;
      }

      // Then create the claim
      const { error } = await supabase.from('claims').insert([
        {
          ...newClaim,
          document_url,
        },
      ]);

      if (error) throw error;

      toast.success('Claim submitted successfully');
      setShowNewClaimModal(false);
      setNewClaim({
        patient_name: '',
        diagnosis: '',
        treatment: '',
        cost: 0,
        document: null,
      });
      fetchClaims();
    } catch (error) {
      toast.error('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClaims();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('claims_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchClaims)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Claims Dashboard</h2>
        <button
          onClick={() => setShowNewClaimModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          <span>New Claim</span>
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Claims</h3>
            <button
              onClick={fetchClaims}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No claims found. Create your first claim!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Treatment
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {claim.patient_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {claim.treatment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{claim.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          claim.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : claim.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(claim.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Submit New Claim</h2>
              <button
                onClick={() => setShowNewClaimModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FileText className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={newClaim.patient_name}
                  onChange={(e) =>
                    setNewClaim({ ...newClaim, patient_name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Diagnosis
                </label>
                <textarea
                  value={newClaim.diagnosis}
                  onChange={(e) =>
                    setNewClaim({ ...newClaim, diagnosis: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Treatment
                </label>
                <input
                  type="text"
                  value={newClaim.treatment}
                  onChange={(e) =>
                    setNewClaim({ ...newClaim, treatment: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost (₹)
                </label>
                <input
                  type="number"
                  value={newClaim.cost}
                  onChange={(e) =>
                    setNewClaim({ ...newClaim, cost: parseFloat(e.target.value) })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supporting Document
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewClaim({
                      ...newClaim,
                      document: e.target.files ? e.target.files[0] : null,
                    })
                  }
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}