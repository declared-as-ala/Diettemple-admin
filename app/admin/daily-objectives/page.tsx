'use client';

import { useState, useEffect } from 'react';
import { Loader2, Upload, CheckCircle, AlertCircle, Search } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  level: string;
}

interface FormData {
  userId: string;
  userName?: string;
  date: string;
  title: string;
  description: string;
  videoFile: File | null;
}

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  videoUrl?: string;
}

export default function DailyObjectivesPage() {
  const [formData, setFormData] = useState<FormData>({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    videoFile: null,
  });

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: 'idle', message: '' });
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setUserSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const token = localStorage.getItem('adminToken') || '';
        const response = await fetch(
          `/api/admin/users-simple?search=${encodeURIComponent(userSearch)}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUserSearchResults(data.users);
          setShowUserDropdown(true);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearch]);

  const selectUser = (user: User) => {
    setFormData(prev => ({
      ...prev,
      userId: user.id,
      userName: `${user.name} (${user.email})`,
    }));
    setUserSearch('');
    setUserSearchResults([]);
    setShowUserDropdown(false);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setUploadStatus({
          type: 'error',
          message: 'Please select a valid video file (MP4, WebM, etc.)',
        });
        return;
      }

      if (file.size > 500 * 1024 * 1024) {
        setUploadStatus({
          type: 'error',
          message: 'Video file is too large (max 500MB)',
        });
        return;
      }

      setFormData(prev => ({ ...prev, videoFile: file }));
      setUploadStatus({ type: 'idle', message: '' });
    }
  };

  const uploadVideo = async () => {
    if (!formData.videoFile || !formData.userId || !formData.date) {
      setUploadStatus({
        type: 'error',
        message: 'Please fill in user ID, date, and select a video file',
      });
      return;
    }

    setUploadStatus({ type: 'uploading', message: 'Uploading video...' });

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('video', formData.videoFile);

      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch(
        `/api/admin/daily-programs/${formData.userId}/${formData.date}/main-objective/video`,
        {
          method: 'POST',
          body: uploadFormData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);
      setUploadStatus({
        type: 'success',
        message: 'Video uploaded successfully!',
        videoUrl: data.videoUrl,
      });
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.message}`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.date || !formData.title) {
      setUploadStatus({
        type: 'error',
        message: 'User ID, date, and title are required',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch(
        `/api/admin/daily-programs/${formData.userId}/${formData.date}/main-objective`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            videoUrl: videoUrl || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update objective');
      }

      setUploadStatus({
        type: 'success',
        message: 'Daily objective updated successfully!',
      });

      setFormData({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        videoFile: null,
      });
      setVideoUrl('');
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: `Failed to update: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daily Objectives Manager</h1>
          <p className="mt-2 text-gray-600">Manage "Objectif Principal" videos and instructions for user daily programs</p>
        </div>

        {uploadStatus.type !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
            uploadStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
            {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {uploadStatus.type === 'uploading' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />}
            <p className={
              uploadStatus.type === 'success' ? 'text-green-800' :
              uploadStatus.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {uploadStatus.message}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upload Video & Update Objective</h2>
            <p className="text-sm text-gray-600 mt-1">Upload a video and set the daily objective for a specific user and date</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Select User</label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {showUserDropdown && userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition"
                      >
                        <p className="font-medium text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">Level: {user.level || 'N/A'}</p>
                      </button>
                    ))}
                  </div>
                )}

                {isSearching && userSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>

              {formData.userId && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-sm text-blue-900">Selected: {formData.userName || formData.userId}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, userId: '', userName: '' }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Change user
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Date (YYYY-MM-DD)</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-4">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div>
                  <label htmlFor="video" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">Choose video file</span>
                    <input
                      id="video"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                  <p className="text-xs text-gray-400">MP4, WebM (max 500MB)</p>
                </div>

                {formData.videoFile && (
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Selected: {formData.videoFile.name}</p>
                    <p className="text-gray-500">{(formData.videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>

              {formData.videoFile && (
                <button
                  type="button"
                  onClick={uploadVideo}
                  disabled={uploadStatus.type === 'uploading'}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                >
                  {uploadStatus.type === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Video'
                  )}
                </button>
              )}

              {videoUrl && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✓ Video uploaded: {videoUrl}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Objective Title *</label>
              <input
                type="text"
                name="title"
                placeholder="e.g., Objectif Principal, Focus on Form"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Instructions / Description</label>
              <textarea
                name="description"
                placeholder="e.g., Complete your scheduled session with proper form and full range of motion."
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Video URL (auto-filled after upload)</label>
              <input
                type="text"
                placeholder="/media/videos/objective.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={videoUrl && uploadStatus.type === 'success'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">This will be filled automatically when you upload a video, or enter a URL manually</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !formData.userId || !formData.date || !formData.title}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Daily Objective'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to use</h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Get the user ID from the Users management page</li>
            <li>Select the date for the daily program</li>
            <li>Upload a video file (MP4 or WebM)</li>
            <li>Fill in the objective title and instructions</li>
            <li>Click "Update Daily Objective" to save</li>
          </ol>
          <p className="pt-4 text-xs text-gray-400">The video will appear in the app under "Objectif Principal" section</p>
        </div>
      </div>
    </div>
  );
}
