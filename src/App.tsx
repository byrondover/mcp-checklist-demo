import { useEffect, useMemo, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { DisplayCodeButton } from './components/demo/display-code-button'
import { DisplayJsonButton } from './components/demo/display-json-button'
import { GoogleDocExportButton } from './components/demo/google-doc-export-button'
import { openPDFInNewTab, PDFViewer } from './components/pdf-viewer'
import { ChecklistPrintable } from './components/printables/checklist/checklist'
import { Border, SelectBorder } from './components/printables/selects/select-border'
import { Color, SelectColor } from './components/printables/selects/select-color'
import { SelectSection } from './components/printables/selects/select-section'
import { Button } from './components/ui/button'
import { Checkbox } from './components/ui/checkbox'
import { Label } from './components/ui/label'
import { Switch } from './components/ui/switch'
import { mockClass, mockCourse, mockUserSettings } from './data/checklist-demo-data'
import { useChecklistOptions, YesNo } from './hooks/use-checklist-options'
import { demoSourceFiles } from './lib/demo-source-files'

export default function App() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const {
    sectionId,
    border,
    color,
    teacherSignOff,
    includeVideoHyperlinks,
    includeClassName,
    selectedLessonIds,
    setSectionId,
    setBorder,
    setColor,
    setTeacherSignOff,
    setIncludeVideoHyperlinks,
    setIncludeClassName,
    setSelectedLessonIds,
  } = useChecklistOptions({
    defaultSectionId: mockCourse?.units[0]?.sections[0]?.id ?? null,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevSectionIdRef = useRef<string | null | undefined>()

  const sections = useMemo(() => mockCourse.units.flatMap((u) => u.sections), [])
  const section = useMemo(() => sections.find((s) => s.id === sectionId) || null, [sections, sectionId])
  const unit = useMemo(() => mockCourse.units.find((u) => u.sections.some((s) => s.id === sectionId)) || null, [sectionId])

  // Initialize selectedLessonIds when section changes
  useEffect(() => {
    // Only run if section actually changed
    if (prevSectionIdRef.current !== sectionId) {
      const lessonIds = section?.lessons?.map((l) => l.id) || []
      setSelectedLessonIds(lessonIds)
      prevSectionIdRef.current = sectionId
    }
  }, [section?.id, section?.lessons, sectionId, setSelectedLessonIds])

  // Filter lessons based on selectedLessonIds
  const filteredLessons = useMemo(
    () => (section?.lessons || []).filter((lesson) => selectedLessonIds.includes(lesson.id)),
    [section?.lessons, selectedLessonIds],
  )

  const document = useMemo(
    () => (
      <ChecklistPrintable
        courseName={mockCourse.name}
        courseClassName={mockClass.name}
        sectionName={section?.name || ''}
        unitName={unit?.name || ''}
        lessons={filteredLessons as never}
        border={border}
        color={color}
        teacherSignOff={teacherSignOff}
        includeVideoHyperlinks={includeVideoHyperlinks}
        includeClassName={includeClassName}
        settings={mockUserSettings}
      />
    ),
    [
      section?.name,
      unit?.name,
      filteredLessons,
      border,
      color,
      teacherSignOff,
      includeVideoHyperlinks,
      includeClassName,
    ],
  )

  const onSelectSection = (value: string | undefined) => {
    setSectionId(value || '')
  }

  const onSelectBorder = (value: string) => {
    setBorder(value as Border)
  }

  const onSelectColor = (value: string) => {
    setColor(value as Color)
  }

  const onTeacherSignOffChange = (value: boolean) => {
    setTeacherSignOff(value ? YesNo.YES : YesNo.NO)
  }

  const onIncludeVideoHyperlinksChange = (value: boolean) => {
    setIncludeVideoHyperlinks(value ? YesNo.YES : YesNo.NO)
  }

  const onIncludeClassNameChange = (value: boolean) => {
    setIncludeClassName(value ? YesNo.YES : YesNo.NO)
  }

  const onLessonCheckChange = (lessonId: string, checked: boolean) => {
    if (checked) {
      setSelectedLessonIds([...selectedLessonIds, lessonId])
    } else {
      setSelectedLessonIds(selectedLessonIds.filter((id) => id !== lessonId))
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Checklist Printout</h1>
        </div>

        <div className="flex flex-col tablet:flex-row gap-6">
          {/* PDF Preview */}
          <div className="flex-1 bg-primary/5 rounded-lg border border-input p-4 tablet:p-6">
            {isClient && filteredLessons.length > 0 ? (
              <PDFViewer document={document} color={color} canvasRef={canvasRef} scale={0.78} />
            ) : (
              <div className="flex items-center justify-center h-[600px] text-center">
                <span className="text-muted-foreground">
                  {!isClient
                    ? 'Loading...'
                    : section?.lessons?.length
                    ? 'Select at least one lesson to display'
                    : `No lessons found in ${section?.name}`}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-5 w-full tablet:w-[280px]">
            <h2 className="font-semibold text-lg">Checklist personalization</h2>

            <SelectSection units={mockCourse.units as never} value={section?.id} onValueChange={onSelectSection} />

            {/* Lessons Multi-Select */}
            {section?.lessons && section.lessons.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Lessons</Label>
                <div className="flex flex-col gap-2">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`lesson-${lesson.id}`}
                        checked={selectedLessonIds.includes(lesson.id)}
                        onCheckedChange={(checked) => onLessonCheckChange(lesson.id, checked as boolean)}
                      />
                      <label htmlFor={`lesson-${lesson.id}`} className="text-sm cursor-pointer">
                        {lesson.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SelectBorder value={border} onValueChange={onSelectBorder} />
            <SelectColor value={color} onValueChange={onSelectColor} />

            <div className="flex items-center gap-2 mt-6">
              <Switch id="include-class-name" checked={includeClassName === YesNo.YES} onCheckedChange={onIncludeClassNameChange} />
              <label htmlFor="include-class-name" className="text-sm cursor-pointer">
                Include class name
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="include-video-hyperlinks"
                checked={includeVideoHyperlinks === YesNo.YES}
                onCheckedChange={onIncludeVideoHyperlinksChange}
              />
              <label htmlFor="include-video-hyperlinks" className="text-sm cursor-pointer">
                Include video hyperlinks
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="teacher-sign-off" checked={teacherSignOff === YesNo.YES} onCheckedChange={onTeacherSignOffChange} />
              <label htmlFor="teacher-sign-off" className="text-sm cursor-pointer">
                Teacher Sign Off
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              {isClient && (
                <GoogleDocExportButton
                  lessons={filteredLessons}
                  sectionName={section?.name || ''}
                  unitName={unit?.name || ''}
                  courseName={mockCourse.name}
                  courseClassName={mockClass.name}
                  border={border}
                  color={color}
                  googleClientId={googleClientId}
                  includeClassName={includeClassName}
                  teacherSignOff={teacherSignOff}
                  includeVideoHyperlinks={includeVideoHyperlinks}
                />
              )}
              {isClient && (
                <Button onClick={() => openPDFInNewTab(canvasRef.current!, document, color, 'portrait')}>Print</Button>
              )}
              <DisplayJsonButton
                courseSection={{
                  id: section?.id,
                  name: section?.name,
                  sectionLetter: section?.sectionLetter,
                  unitId: section?.unitId,
                  unitName: unit?.name,
                  courseName: mockCourse.name,
                  courseClassName: mockClass.name,
                }}
                lessons={section?.lessons || []}
                settings={mockUserSettings as unknown as Record<string, unknown>}
              />
              <DisplayCodeButton sourceFiles={demoSourceFiles} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
