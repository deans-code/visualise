## ADDED Requirements

### Requirement: Page and view accent colours
Each page (People, Explore, Dictionary) and each Explore view (Network, Matrix, People and terms, By category) SHALL have its own accent from the profile tool's palette, shown on its tab or view button (outlined when inactive, filled when selected, as in the profile tool), and on that page's heading, help panel, primary buttons and card top borders, in both light and dark themes. Section accents SHALL keep their meaning of profile section inside filters, the dictionary and category headings.

#### Scenario: Tabs
- **WHEN** the user looks at the page tabs
- **THEN** each tab has a different accent, and the selected tab is filled with its own accent

#### Scenario: Page chrome follows the tab
- **WHEN** the user switches from People to Explore
- **THEN** the heading, help panel and buttons change to Explore's accent

#### Scenario: Views
- **WHEN** the user switches between Network, Matrix, People and terms and By category
- **THEN** the selected view button and the view description panel use that view's accent

#### Scenario: Colour is not the only cue
- **WHEN** a page or view is indicated by colour
- **THEN** it is also indicated by its label and by the pressed state of its button

#### Scenario: Contrast
- **WHEN** the automated contrast test runs over the page and view accents
- **THEN** accent-on-surface, accent-text-on-accent and body-text-on-tint pairs meet WCAG AA in both themes
