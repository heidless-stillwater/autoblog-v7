import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Media from './Media';
import { useStore } from '../store';
import { MemoryRouter } from 'react-router-dom';

// Mock the store
vi.mock('../store');

const mockMedia = [
    {
        id: '1',
        name: 'Test Image 1',
        type: 'image/jpeg',
        url: 'https://example.com/1.jpg',
        createdAt: Date.now(),
        size: 1024,
        tags: ['Tag1'],
    },
    {
        id: '2',
        name: 'Test Image 2',
        type: 'image/png',
        url: 'https://example.com/2.png',
        createdAt: Date.now(),
        size: 2048,
        tags: ['Tag2'],
    },
];

const mockMediaTags = ['Tag1', 'Tag2', 'Tag3'];

describe('Media Page - Details Modal', () => {
    const updateMediaMock = vi.fn();
    const deleteMediaMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            media: mockMedia,
            addMedia: vi.fn(),
            updateMedia: updateMediaMock,
            deleteMedia: deleteMediaMock,
            posts: [],
            mediaTags: mockMediaTags,
            addMediaTag: vi.fn(),
            deleteMediaTag: vi.fn(),
            updateMediaTag: vi.fn(),
        });
    });

    it('renders media items in grid view', () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Image 1')).toBeInTheDocument();
        expect(screen.getByText('Test Image 2')).toBeInTheDocument();
    });

    it('opens the details modal in show mode when clicking the Eye icon in Grid View', async () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        // Check if modal is open by searching for the "Copy Public URL" button unique to the modal
        expect(screen.getByText('Copy Public URL')).toBeInTheDocument();

        // Both the grid item and the modal will have "Test Image 1"
        const titles = screen.getAllByText('Test Image 1');
        expect(titles.length).toBeGreaterThan(1);

        const showModeBtn = screen.getByTitle('Show Mode');
        expect(showModeBtn).toHaveClass('bg-emerald-600');
    });

    it('switches to edit mode in the modal', async () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        const editModeBtn = screen.getByTitle('Edit Mode');
        fireEvent.click(editModeBtn);

        // In edit mode, there should be an input for the name
        const nameInput = screen.getByDisplayValue('Test Image 1');
        expect(nameInput).toBeInTheDocument();
        expect(nameInput.tagName).toBe('INPUT');

        expect(editModeBtn).toHaveClass('bg-amber-600');
    });

    it('updates item name in edit mode', async () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        fireEvent.click(screen.getByTitle('Edit Mode'));

        const nameInput = screen.getByDisplayValue('Test Image 1');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });
        fireEvent.blur(nameInput);

        await waitFor(() => {
            expect(updateMediaMock).toHaveBeenCalledWith('1', { name: 'New Name' });
        });
    });

    it('toggles tags in edit mode', async () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        fireEvent.click(screen.getByTitle('Edit Mode'));

        // Tag1 is already present. Tag2 and Tag3 are available.
        // Instead of getByText('Tag1'), we just look for any element containing '+ Tag2'
        const addTag2Btn = screen.getByText('+ Tag2');
        fireEvent.click(addTag2Btn);

        await waitFor(() => {
            expect(updateMediaMock).toHaveBeenCalled();
        });
    });

    it('opens the details modal from List View', async () => {
        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        // Switch to List View
        const listViewBtn = screen.getByTitle('List View');
        fireEvent.click(listViewBtn);

        // Find the "Show Details" button in the list
        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        expect(screen.getByText('Copy Public URL')).toBeInTheDocument();
        expect(screen.getAllByText('Test Image 1').length).toBeGreaterThan(0);
    });

    it('displays the mediaPrompt if available in the modal', async () => {
        const itemWithPrompt = {
            ...mockMedia[0],
            mediaPrompt: 'A beautiful sunset over the mountains'
        };

        (useStore as any).mockReturnValue({
            media: [itemWithPrompt],
            addMedia: vi.fn(),
            updateMedia: vi.fn(),
            deleteMedia: vi.fn(),
            posts: [],
            mediaTags: mockMediaTags,
            addMediaTag: vi.fn(),
            deleteMediaTag: vi.fn(),
            updateMediaTag: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Media />
            </MemoryRouter>
        );

        const showDetailsBtns = screen.getAllByTitle('Show Details');
        fireEvent.click(showDetailsBtns[0]);

        expect(screen.getByText('A beautiful sunset over the mountains')).toBeInTheDocument();
    });
});
