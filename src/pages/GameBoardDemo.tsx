import { useEffect, useMemo, useRef, useState } from 'react'
import { DisplayCodeButton } from '../components/demo/display-code-button'
import { DisplayJsonButton } from '../components/demo/display-json-button'
import { openPDFInNewTab, PDFViewer } from '../components/pdf-viewer'
import { GameBoardPrintable } from '../components/printables/gameboard/gameboard'
import { Color, SelectColor } from '../components/printables/selects/select-color'
import { GraphicTheme, SelectGraphicTheme } from '../components/printables/selects/select-graphic-theme'
import { LessonDivider, SelectLessonDivider } from '../components/printables/selects/select-lesson-divider'
import { SelectSection } from '../components/printables/selects/select-section'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { YesNo } from '../hooks/use-checklist-options'
import { useGameBoardOptions } from '../hooks/use-gameboard-options'
import { mockClass, mockCourse, mockUserSettings } from '../data/checklist-demo-data'
import { demoGameBoardSourceFiles } from '../lib/demo-gameboard-source-files'
import { GoogleGameBoardExportButton } from '../components/demo/google-gameboard-export-button'

export default function GameBoardDemo() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get first section ID from first unit as default
  const defaultSectionId = mockCourse?.units[0]?.sections[0]?.id ?? null

  // Game Board options state
  const {
    sectionId,
    lessonDivider,
    graphicTheme,
    color,
    includeClassName,
    setSectionId,
    setLessonDivider,
    setGraphicTheme,
    setColor,
    setIncludeClassName,
  } = useGameBoardOptions({
    defaultSectionId,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Computed values
  const sections = useMemo(() => mockCourse.units.flatMap((u) => u.sections), [])
  const section = useMemo(() => sections.find((s) => s.id === sectionId) || null, [sections, sectionId])
  const unit = useMemo(() => mockCourse.units.find((u) => u.sections.some((s) => s.id === sectionId)) || null, [sectionId])

  // Memoized document
  const document = useMemo(
    () => (
      <GameBoardPrintable
        sectionName={section?.name || ''}
        courseName={mockCourse.name}
        unitName={unit?.name || ''}
        lessons={(section?.lessons as never) || []}
        lessonDivider={lessonDivider}
        graphicTheme={graphicTheme}
        settings={mockUserSettings}
        courseClassName={mockClass.name}
        includeClassName={includeClassName}
      />
    ),
    [section?.name, section?.lessons, unit?.name, lessonDivider, graphicTheme, includeClassName],
  )

  const onSelectSection = (value: string | undefined) => {
    setSectionId(value || '')
  }

  const onSelectLessonDivider = (value: string) => {
    setLessonDivider(value as LessonDivider)
  }

  const onSelectGraphicTheme = (value: string) => {
    setGraphicTheme(value as GraphicTheme)
  }

  const onSelectColor = (value: string) => {
    setColor(value as Color)
  }

  const onIncludeClassNameChange = (value: boolean) => {
    setIncludeClassName(value ? YesNo.YES : YesNo.NO)
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Game Board Printout</h1>
        </div>

        <div className="flex flex-col tablet:flex-row gap-6">
          {/* PDF Preview - Left Column */}
          <div className="flex-1 bg-primary/5 rounded-lg border border-input p-4 tablet:p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Note: Game Board is in landscape orientation</p>
            </div>
            {isClient ? (
              section?.lessons?.length && section.lessons.length > 0 ? (
                <PDFViewer document={document} color={color} canvasRef={canvasRef} scale={0.78} />
              ) : (
                <div className="flex items-center justify-center h-[600px] text-center">
                  <span className="text-muted-foreground">No lessons found in {section?.name}</span>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-[600px] text-center">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            )}
          </div>

          {/* Controls - Right Column */}
          <div className="flex flex-col gap-5 w-full tablet:w-[280px]">
            <h2 className="font-semibold text-lg">Game Board personalization</h2>

            <SelectSection units={mockCourse.units as never} value={section?.id} onValueChange={onSelectSection} />

            <SelectLessonDivider value={lessonDivider} onValueChange={onSelectLessonDivider} />

            <SelectGraphicTheme
              value={graphicTheme}
              onValueChange={onSelectGraphicTheme}
              disabled={lessonDivider === LessonDivider.LESSON_NAME || lessonDivider === LessonDivider.LESSON_NUMBER}
            />

            <SelectColor value={color} onValueChange={onSelectColor} />

            <div className="flex items-center gap-2">
              <Switch id="include-class-name" checked={includeClassName === YesNo.YES} onCheckedChange={onIncludeClassNameChange} />
              <label htmlFor="include-class-name" className="text-sm cursor-pointer">
                Include class name
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              {isClient && section?.lessons && section.lessons.length > 0 && (
                <GoogleGameBoardExportButton
                  lessons={section.lessons}
                  sectionName={section.name}
                  unitName={unit?.name || ''}
                  courseName={mockCourse.name}
                  courseClassName={mockClass.name}
                  lessonDivider={lessonDivider}
                  graphicTheme={graphicTheme}
                  color={color}
                  settings={mockUserSettings}
                  googleClientId={googleClientId}
                  includeClassName={includeClassName}
                />
              )}
              {isClient && (
                <Button onClick={() => openPDFInNewTab(canvasRef.current!, document, color, 'landscape')}>Print</Button>
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
              <DisplayCodeButton sourceFiles={demoGameBoardSourceFiles} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
