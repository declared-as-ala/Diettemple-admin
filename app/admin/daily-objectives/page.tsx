'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, AlertCircle, Search } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  level: string;
}

interface MainObjective {
  title: string;
  description: string;
  videoUrl: string | null;
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
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setUserSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/users-simple?search=${encodeURIComponent(userSearch)}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
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
      // Validate video file
      if (!file.type.startsWith('video/')) {
        setUploadStatus({
          type: 'error',
          message: 'Please select a valid video file (MP4, WebM, etc.)',
        });
        return;
      }

      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        setUploadStatus({
          type: 'error',
          message: 'Video file is too large (max 500MB)',
        });
        return;
      }

      setFormData(prev => ({ ...prev, videoFile: file }));
      setUploadStatus({ type: 'idle', message: '' });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

      const response = await fetch(
        `/api/admin/daily-programs/${formData.userId}/${formData.date}/main-objective/video`,
        {
          method: 'POST',
          body: uploadFormData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
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
      const response = await fetch(
        `/api/admin/daily-programs/${formData.userId}/${formData.date}/main-objective`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
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

      // Reset form
      setFormData({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        videoFile: null,
      });
      setVideoUrl('');
      setPreviewUrl('');
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
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Daily Objectives Manager</h1>
        <p className="text-gray-600">Manage "Objectif Principal" videos and instructions for user daily programs</p>
      </div>

      {uploadStatus.type !== 'idle' && (
        <Alert className={`mb-6 ${
          uploadStatus.type === 'success' ? 'bg-green-50 border-green-200' :
          uploadStatus.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {uploadStatus.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
            {uploadStatus.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
            {uploadStatus.type === 'uploading' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
          </div>
          <AlertDescription className={
            uploadStatus.type === 'success' ? 'text-green-800' :
            uploadStatus.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }>
            {uploadStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Video & Update Objective</CardTitle>
          <CardDescription>Upload a video and set the daily objective for a specific user and date</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="userSearch">Select User</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="userSearch"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* User dropdown results */}
                {showUserDropdown && userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 transition"
                      >
                        <p className="font-medium text-sm">{user.name}</p>
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
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="font-medium text-blue-900">Selected: {formData.userName || formData.userId}</p>
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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date (YYYY-MM-DD)</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Video Upload Section */}
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
                <Button
                  type="button"
                  onClick={uploadVideo}
                  disabled={uploadStatus.type === 'uploading'}
                  className="mt-4"
                >
                  {uploadStatus.type === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Video'
                  )}
                </Button>
              )}

              {videoUrl && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✓ Video uploaded: {videoUrl}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Objective Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Objectif Principal, Focus on Form"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Instructions / Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="e.g., Complete your scheduled session with proper form and full range of motion."
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>

            {/* Video URL (optional manual) */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (auto-filled after upload)</Label>
              <Input
                id="videoUrl"
                type="text"
                placeholder="/media/videos/objective.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={videoUrl && uploadStatus.type === 'success'}
              />
              <p className="text-xs text-gray-500">This will be filled automatically when you upload a video, or enter a URL manually</p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !formData.userId || !formData.date || !formData.title}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Daily Objective'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">How to use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>1. Get the user ID from the Users management page</p>
          <p>2. Select the date for the daily program</p>
          <p>3. Upload a video file (MP4 or WebM)</p>
          <p>4. Fill in the objective title and instructions</p>
          <p>5. Click "Update Daily Objective" to save</p>
          <p className="pt-2 text-gray-400">The video will appear in the app under "Objectif Principal" section</p>
        </CardContent>
      </Card>
    </div>
  );
}
