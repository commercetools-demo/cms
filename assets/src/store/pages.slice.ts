import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { Page, PagesState, Component, GridRow, GridCell, ApiResponse } from '../types';
import { debounce } from '../utils/debounce';
import { NUMBER_OF_COLUMNS } from '../constants';

const LOCAL_STORAGE_KEY_PREFIX = 'cms_pages';
const DEBOUNCE_DELAY = 1000;


const fetchPagesApi = async (baseUrl: string): Promise<Page[]> => {
  const response = await fetch(`${baseUrl}/custom-objects`);
  if (!response.ok) {
    throw new Error('Failed to fetch pages');
  }
  const data: ApiResponse<Page>[] = await response.json();
  return data.map(item => item.value);
};

const fetchPageApi = async (baseUrl: string, key: string): Promise<Page> => {
  const response = await fetch(`${baseUrl}/custom-objects/${key}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch page with key: ${key}`);
  }
  const data: ApiResponse<Page> = await response.json();
  return data.value;
};

const createPageApi = async (baseUrl: string, page: Page): Promise<Page> => {
  const response = await fetch(`${baseUrl}/custom-objects/${page.key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: page }),
  });
  if (!response.ok) {
    throw new Error('Failed to create page');
  }
  const data: ApiResponse<Page> = await response.json();
  return data.value;
};

const updatePageApi = async (baseUrl: string, page: Page): Promise<Page> => {
  const response = await fetch(`${baseUrl}/custom-objects/${page.key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: page }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update page with key: ${page.key}`);
  }
  const data: ApiResponse<Page> = await response.json();
  return data.value;
};

const deletePageApi = async (baseUrl: string, key: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/custom-objects/${key}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete page with key: ${key}`);
  }
};

// Create a debounced session storage save function
const saveToSessionStorage = debounce((pages: Page[], businessUnitKey: string) => {
  try {
    // Create a deep clone of the pages to avoid proxy issues
    const safePages = JSON.parse(JSON.stringify({ pages })).pages;
    const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}_${businessUnitKey}`;
    sessionStorage.setItem(storageKey, JSON.stringify(safePages));
  } catch (error) {
    console.error('Error saving to session storage:', error);
  }
}, DEBOUNCE_DELAY);

// Thunks
export const fetchPages = createAsyncThunk('pages/fetchPages', async ({baseUrl, businessUnitKey}: {baseUrl: string, businessUnitKey: string}) => {
  try {
    // First try to get from session storage with business unit specific key
    const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}_${businessUnitKey}`;
    const storedPages = sessionStorage.getItem(storageKey);
    if (storedPages) {
      return JSON.parse(storedPages) as Page[];
    }
    
    // If not in session storage, fetch from API
    const pages = await fetchPagesApi(baseUrl);
    return pages;
  } catch (error) {
    // If API fails, fallback to empty array
    return [] as Page[];
  }
});

export const fetchPage = createAsyncThunk('pages/fetchPage', async ({baseUrl, key}: {baseUrl: string, key: string}) => {
  return await fetchPageApi(baseUrl, key);
});

export const createPage = createAsyncThunk('pages/createPage', async ({baseUrl, page}: {baseUrl: string, page: Page}) => {
  return await createPageApi(baseUrl, page);
});

export const updatePage = createAsyncThunk('pages/updatePage', async ({baseUrl, page}: {baseUrl: string, page: Page}) => {
  return await updatePageApi(baseUrl, page);
});

export const deletePage = createAsyncThunk('pages/deletePage', async ({baseUrl, key}: {baseUrl: string, key: string}) => {
    await deletePageApi(baseUrl, key);
  return key;
});

// Helper functions
const createEmptyGridRow = (): GridRow => {
  const cells: GridCell[] = [];
  
  // Create cells that total to NUMBER_OF_COLUMNS
  // Initially, we'll create NUMBER_OF_COLUMNS cells, each with colSpan of 1
  for (let i = 0; i < NUMBER_OF_COLUMNS; i++) {
    cells.push({
      id: uuidv4(),
      componentId: null,
      colSpan: 1,
    });
  }
  
  return {
    id: uuidv4(),
    cells,
  };
};

// Initial state
const initialState: PagesState = {
  pages: [],
  currentPage: null,
  loading: false,
  error: null,
  unsavedChanges: false,
  businessUnitKey: '',
};

// Slice
const pagesSlice = createSlice({
  name: 'pages',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<string>) => {
      const page = state.pages.find(p => p.key === action.payload);
      state.currentPage = page || null;
    },
    
    createEmptyPage: (state, action: PayloadAction<{ name: string, route: string, businessUnitKey: string }>) => {
      const newPage: Page = {
        key: `page-${uuidv4()}`,
        name: action.payload.name,
        uuid: uuidv4(),
        route: action.payload.route,
        businessUnitKey: action.payload.businessUnitKey,
        layout: {
          rows: [createEmptyGridRow()],
        },
        components: [],
      };
      
      state.pages.push(newPage);
      state.currentPage = newPage;
      state.unsavedChanges = true;
      state.businessUnitKey = action.payload.businessUnitKey;
      
      // Save to session storage
      saveToSessionStorage(state.pages, action.payload.businessUnitKey);
    },
    
    addRow: (state) => {
      if (state.currentPage) {
        state.currentPage.layout.rows.push(createEmptyGridRow());
        state.unsavedChanges = true;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      }
    },
    
    removeRow: (state, action: PayloadAction<string>) => {
      if (state.currentPage) {
        state.currentPage.layout.rows = state.currentPage.layout.rows.filter(
          row => row.id !== action.payload
        );
        state.unsavedChanges = true;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      }
    },
    
    addComponent: (state, action: PayloadAction<{ component: Component, rowId: string, cellId: string }>) => {
      if (state.currentPage) {
        const { component, rowId, cellId } = action.payload;
        
        // Add component to the components array
        state.currentPage.components.push(component);
        
        // Set the componentId in the cell
        const rowIndex = state.currentPage.layout.rows.findIndex(row => row.id === rowId);
        if (rowIndex !== -1) {
          const cellIndex = state.currentPage.layout.rows[rowIndex].cells.findIndex(
            cell => cell.id === cellId
          );
          if (cellIndex !== -1) {
            state.currentPage.layout.rows[rowIndex].cells[cellIndex].componentId = component.id;
          }
        }
        
        state.unsavedChanges = true;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      }
    },
    
    updateComponent: (state, action: PayloadAction<Component>) => {
      if (state.currentPage) {
        const componentIndex = state.currentPage.components.findIndex(
          c => c.id === action.payload.id
        );
        if (componentIndex !== -1) {
          state.currentPage.components[componentIndex] = action.payload;
          state.unsavedChanges = true;
          
          // Save to session storage
          saveToSessionStorage(state.pages, state.businessUnitKey);
        }
      }
    },
    
    removeComponent: (state, action: PayloadAction<string>) => {
      if (state.currentPage) {
        // Remove component from components array
        state.currentPage.components = state.currentPage.components.filter(
          c => c.id !== action.payload
        );
        
        // Remove component references from cells
        for (const row of state.currentPage.layout.rows) {
          for (const cell of row.cells) {
            if (cell.componentId === action.payload) {
              cell.componentId = null;
            }
          }
        }
        
        state.unsavedChanges = true;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      }
    },
    
    updateCellSpan: (state, action: PayloadAction<{ 
      rowId: string, 
      cellId: string, 
      colSpan: number,
      shouldRemoveEmptyCell?: boolean,
      shouldAddEmptyCell?: boolean
    }>) => {
      if (state.currentPage) {
        const { rowId, cellId, colSpan, shouldRemoveEmptyCell, shouldAddEmptyCell } = action.payload;
        
        const rowIndex = state.currentPage.layout.rows.findIndex(row => row.id === rowId);
        if (rowIndex !== -1) {
          const row = state.currentPage.layout.rows[rowIndex];
          const cellIndex = row.cells.findIndex(cell => cell.id === cellId);
          
          if (cellIndex !== -1) {
            // Get the old span to calculate the difference
            const oldSpan = row.cells[cellIndex].colSpan;
            const spanDifference = colSpan - oldSpan;
            
            // Update the cell's span
            row.cells[cellIndex].colSpan = colSpan;
            
            // If we're increasing the span and should remove empty cells
            if (spanDifference > 0 && shouldRemoveEmptyCell) {
              // Find empty cells (cells with no component)
              const emptyCells = row.cells
                .map((cell, idx) => ({ cell, idx }))
                .filter(item => !item.cell.componentId && item.idx !== cellIndex);
              
              // Remove empty cells equal to the span difference
              if (emptyCells.length > 0) {
                // Sort in reverse order to avoid index shifting when removing
                const cellsToRemove = emptyCells
                  .slice(0, spanDifference)
                  .sort((a, b) => b.idx - a.idx);
                
                // Remove cells
                for (const { idx } of cellsToRemove) {
                  row.cells.splice(idx, 1);
                }
              }
            }
            
            // If we're decreasing the span and should add empty cells
            if (spanDifference < 0 && shouldAddEmptyCell) {
              // Create new empty cells
              const newCells = Array(-spanDifference).fill(0).map(() => ({
                id: uuidv4(),
                componentId: null,
                colSpan: 1
              }));
              
              // Add them after the current cell
              row.cells.splice(cellIndex + 1, 0, ...newCells);
            }
            
            state.unsavedChanges = true;
            
            // Save to session storage
            saveToSessionStorage(state.pages, state.businessUnitKey);
          }
        }
      }
    },
    
    moveComponent: (state, action: PayloadAction<{ 
      componentId: string,
      sourceRowId: string,
      sourceCellId: string,
      targetRowId: string, 
      targetCellId: string 
    }>) => {
      if (state.currentPage) {
        const { componentId, sourceRowId, sourceCellId, targetRowId, targetCellId } = action.payload;
        
        // Find source cell and clear it
        const sourceRowIndex = state.currentPage.layout.rows.findIndex(row => row.id === sourceRowId);
        if (sourceRowIndex !== -1) {
          const sourceCellIndex = state.currentPage.layout.rows[sourceRowIndex].cells.findIndex(
            cell => cell.id === sourceCellId
          );
          if (sourceCellIndex !== -1) {
            state.currentPage.layout.rows[sourceRowIndex].cells[sourceCellIndex].componentId = null;
          }
        }
        
        // Find target cell and set the component
        const targetRowIndex = state.currentPage.layout.rows.findIndex(row => row.id === targetRowId);
        if (targetRowIndex !== -1) {
          const targetCellIndex = state.currentPage.layout.rows[targetRowIndex].cells.findIndex(
            cell => cell.id === targetCellId
          );
          if (targetCellIndex !== -1) {
            state.currentPage.layout.rows[targetRowIndex].cells[targetCellIndex].componentId = componentId;
          }
        }
        
        state.unsavedChanges = true;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      }
    },
    
    saveCurrentPage: (state) => {
      state.unsavedChanges = false;
    },
    
    setBusinessUnitKey: (state, action: PayloadAction<string>) => {
      state.businessUnitKey = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pages
      .addCase(fetchPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pages = action.payload;
        state.unsavedChanges = false;
        
        // Set businessUnitKey from the first page if available
        if (action.payload.length > 0 && action.payload[0].businessUnitKey) {
          state.businessUnitKey = action.payload[0].businessUnitKey;
        }
        
        // Save to session storage
        if (state.businessUnitKey) {
          saveToSessionStorage(state.pages, state.businessUnitKey);
        }
      })
      .addCase(fetchPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch pages';
      })
      
      // Fetch page
      .addCase(fetchPage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update or add the page
        const index = state.pages.findIndex(p => p.key === action.payload.key);
        if (index !== -1) {
          state.pages[index] = action.payload;
        } else {
          state.pages.push(action.payload);
        }
        
        state.currentPage = action.payload;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      })
      .addCase(fetchPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch page';
      })
      
      // Create page
      .addCase(createPage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Replace the temporary page with the server response
        const index = state.pages.findIndex(p => p.key === action.payload.key);
        if (index !== -1) {
          state.pages[index] = action.payload;
        } else {
          state.pages.push(action.payload);
        }
        
        state.currentPage = action.payload;
        state.unsavedChanges = false;
        
        // Update businessUnitKey if needed
        if (action.payload.businessUnitKey) {
          state.businessUnitKey = action.payload.businessUnitKey;
        }
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      })
      .addCase(createPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create page';
      })
      
      // Update page
      .addCase(updatePage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update the page
        const index = state.pages.findIndex(p => p.key === action.payload.key);
        if (index !== -1) {
          state.pages[index] = action.payload;
        }
        
        if (state.currentPage?.key === action.payload.key) {
          state.currentPage = action.payload;
        }
        
        state.unsavedChanges = false;
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      })
      .addCase(updatePage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update page';
      })
      
      // Delete page
      .addCase(deletePage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove the page
        state.pages = state.pages.filter(p => p.key !== action.payload);
        
        // If current page was deleted, set to null
        if (state.currentPage?.key === action.payload) {
          state.currentPage = null;
        }
        
        // Save to session storage
        saveToSessionStorage(state.pages, state.businessUnitKey);
      })
      .addCase(deletePage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete page';
      });
  },
});

export const {
  setCurrentPage,
  createEmptyPage,
  addRow,
  removeRow,
  addComponent,
  updateComponent,
  removeComponent,
  updateCellSpan,
  moveComponent,
  saveCurrentPage,
  setBusinessUnitKey,
} = pagesSlice.actions;

export default pagesSlice.reducer;