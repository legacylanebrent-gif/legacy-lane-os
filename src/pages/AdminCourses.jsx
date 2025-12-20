import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, Users, DollarSign, BookOpen } from 'lucide-react';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchQuery, statusFilter, courses]);

  const loadCourses = async () => {
    try {
      const data = await base44.entities.Course.list();
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    setFilteredCourses(filtered);
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
      published: { label: 'Published', className: 'bg-green-100 text-green-700' },
      archived: { label: 'Archived', className: 'bg-red-100 text-red-700' }
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Courses Management</h1>
        <p className="text-slate-600">{courses.length} total courses</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by title or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredCourses.map(course => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {course.thumbnail_url && (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{course.title}</h3>
                    {getStatusBadge(course.status)}
                  </div>
                  {course.featured && (
                    <Badge className="bg-orange-600 text-white">Featured</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {course.instructor_name && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium">Instructor:</span> {course.instructor_name}
                    </div>
                  )}
                  
                  {course.category && (
                    <div>
                      <span className="font-medium">Category:</span> {course.category}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-slate-900">
                      {course.price ? `$${course.price.toLocaleString()}` : 'Free'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs pt-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.enrolled_count || 0} students
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lesson_count || 0} lessons
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No courses found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}