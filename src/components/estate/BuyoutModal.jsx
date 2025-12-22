import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Sparkles, DollarSign, CheckCircle } from 'lucide-react';

export default function BuyoutModal({ open, onClose, sale }) {
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, successful: 0 });
  const [labelingStatus, setLabelingStatus] = useState({ current: 0, total: 0, completed: false });
  const [isLabeling, setIsLabeling] = useState(false);
  const [labeledItems, setLabeledItems] = useState([]);
  const [offerPercentage, setOfferPercentage] = useState(25);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);

  const processImage = async (file) => {
    return new Promise((resolve, reject) => {
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      if (fileType === 'image/webp' || fileName.endsWith('.webp')) {
        reject(new Error('WebP format is not supported. Please convert to JPG or PNG first.'));
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;
            const maxSize = 1200;

            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }
                const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg'
                });
                resolve(processedFile);
              },
              'image/jpeg',
              0.85
            );
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e, isCamera = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length, successful: 0 });

    const errors = [];

    try {
      const imageObjects = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          const processedFile = await processImage(file);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
          imageObjects.push({ url: file_url, name: '', description: '', price: null });
          setUploadProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
          
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      if (imageObjects.length > 0) {
        setImages(prev => [...prev, ...imageObjects]);
      }

      if (errors.length > 0) {
        alert(`Some files could not be uploaded:\n\n${errors.join('\n')}`);
      }

      if (isCamera && imageObjects.length > 0) {
        setShowCameraPrompt(true);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
      setUploadProgress({ current: 0, total: 0, successful: 0 });
      e.target.value = '';
    }
  };

  const handleTakeAnother = () => {
    setShowCameraPrompt(false);
    document.getElementById('buyout-camera-upload')?.click();
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setLabeledItems(prev => prev.filter((_, i) => i !== index));
  };

  const batchLabelImages = async () => {
    if (images.length === 0) return;

    setIsLabeling(true);
    setLabelingStatus({ current: 0, total: images.length, completed: false });

    const labeled = [];

    try {
      for (let i = 0; i < images.length; i++) {
        setLabelingStatus(prev => ({ ...prev, current: i + 1 }));

        try {
          const prompt = `You are analyzing an item photo from an estate sale for a buyout valuation.

Analyze this photo and provide:
1. Item name (be specific but concise)
2. Brief description (2-3 sentences about condition, notable features)
3. Estimated fair market value in USD (be realistic for estate sale items)

Return ONLY valid JSON in this exact format:
{
  "name": "Item name here",
  "description": "Description here",
  "price": 150.00
}`;

          const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            file_urls: [images[i].url],
            response_json_schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" }
              },
              required: ["name", "description", "price"]
            }
          });

          labeled.push({
            ...images[i],
            name: result.name,
            description: result.description,
            price: result.price
          });

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Error labeling image:', error);
          labeled.push({
            ...images[i],
            name: 'Unlabeled Item',
            description: 'Failed to analyze',
            price: 0
          });
        }
      }

      setLabeledItems(labeled);
      setLabelingStatus(prev => ({ ...prev, completed: true }));
    } catch (error) {
      console.error('Batch labeling error:', error);
      alert('Failed to complete batch labeling');
    } finally {
      setIsLabeling(false);
    }
  };

  const getTotalValue = () => {
    return labeledItems.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const getOfferAmount = () => {
    return getTotalValue() * (offerPercentage / 100);
  };

  const handleClose = () => {
    setImages([]);
    setLabeledItems([]);
    setLabelingStatus({ current: 0, total: 0, completed: false });
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Estate Buyout Valuation - {sale?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Upload Section */}
            <div>
              <Label className="text-lg font-semibold mb-3 block">1. Upload Photos</Label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                    id="buyout-camera-upload"
                    disabled={uploadingImages || isLabeling}
                  />
                  <label htmlFor="buyout-camera-upload" className="cursor-pointer">
                    <Camera className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">Take Photo</p>
                  </label>
                </div>

                <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center bg-green-50">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="hidden"
                    id="buyout-file-upload"
                    disabled={uploadingImages || isLabeling}
                  />
                  <label htmlFor="buyout-file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-900">Choose Files</p>
                  </label>
                </div>
              </div>

              {uploadingImages && uploadProgress.total > 0 && (
                <div className="mb-4 space-y-2 p-3 bg-slate-50 rounded-lg">
                  <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                  <p className="text-xs text-slate-600 text-center">
                    Processing {uploadProgress.current} of {uploadProgress.total} images... ({uploadProgress.successful} successful)
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={img.url} 
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Labeling Section */}
            {images.length > 0 && (
              <div>
                <Label className="text-lg font-semibold mb-3 block">2. AI Price Analysis</Label>
                <Button
                  onClick={batchLabelImages}
                  disabled={isLabeling || labelingStatus.completed}
                  className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {isLabeling ? 'Analyzing Items...' : labelingStatus.completed ? 'Analysis Complete' : 'Start AI Analysis'}
                </Button>

                {isLabeling && (
                  <div className="mt-4 space-y-2 p-3 bg-purple-50 rounded-lg">
                    <Progress value={(labelingStatus.current / labelingStatus.total) * 100} />
                    <p className="text-sm text-purple-700 text-center">
                      Analyzing item {labelingStatus.current} of {labelingStatus.total}...
                    </p>
                  </div>
                )}

                {labelingStatus.completed && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">
                      All {labeledItems.length} items analyzed successfully
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Labeled Items Display */}
            {labeledItems.length > 0 && (
              <div>
                <Label className="text-lg font-semibold mb-3 block">3. Item Valuations</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {labeledItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <img src={item.url} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-600 line-clamp-1">{item.description}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        ${item.price?.toFixed(2) || '0.00'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offer Section */}
            {labelingStatus.completed && labeledItems.length > 0 && (
              <div className="border-t-2 pt-6">
                <Label className="text-lg font-semibold mb-4 block">4. Buyout Offer</Label>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Total Estimated Value:</span>
                    <span className="text-xl font-bold text-slate-900">${getTotalValue().toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="offer-percentage">Offer Percentage:</Label>
                      <Input
                        id="offer-percentage"
                        type="number"
                        min="20"
                        max="30"
                        value={offerPercentage}
                        onChange={(e) => setOfferPercentage(Math.min(30, Math.max(20, parseInt(e.target.value) || 25)))}
                        className="w-20 text-center"
                      />
                    </div>
                    <p className="text-xs text-slate-600">Adjust between 20-30% of estimated value</p>
                  </div>

                  <div className="border-t-2 border-orange-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-orange-600" />
                        Buyout Offer Amount:
                      </span>
                      <span className="text-3xl font-bold text-orange-600">
                        ${getOfferAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const summary = `Buyout Analysis for ${sale?.title}

Total Items: ${labeledItems.length}
Estimated Value: $${getTotalValue().toFixed(2)}
Offer Percentage: ${offerPercentage}%
Buyout Offer: $${getOfferAmount().toFixed(2)}

Items:
${labeledItems.map((item, i) => `${i + 1}. ${item.name} - $${item.price?.toFixed(2)}`).join('\n')}`;
                      
                      navigator.clipboard.writeText(summary);
                      alert('Buyout summary copied to clipboard!');
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Copy Summary
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Take Another Photo Prompt */}
      <Dialog open={showCameraPrompt} onOpenChange={setShowCameraPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Photo Saved!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">Your photo has been saved. Would you like to take another?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCameraPrompt(false)}
                className="flex-1"
              >
                Done
              </Button>
              <Button
                onClick={handleTakeAnother}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Another
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}