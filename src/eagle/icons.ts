export function closeIconSvg(): string {
  return `
    <svg class="material-icon" viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
    </svg>
  `;
}

export type StatusIconName = 'origin' | 'pinned' | 'audio' | 'muted';

const STATUS_ICON_PATHS: Record<StatusIconName, string> = {
  origin:
    'M560-240 320-480l240-240 56 56-144 144h328v80H472l144 144-56 56ZM240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h160v80H240v480h160v80H240Z',
  pinned:
    'm640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z',
  audio:
    'M560-131v-82q90-26 145-100t55-167q0-93-55-167T560-747v-82q124 28 202 125.5T840-480q0 126-78 223.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606 314-520H200v80h114l86 86v-252ZM300-480Z',
  muted:
    'm616-320-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104 104 104-56 56-104-104-104 104ZM120-360v-240h160l200-200v640L280-360H120Zm280-246-86 86H200v80h114l86 86v-252Zm-100 126Z'
};

export function statusIconSvg(name: StatusIconName): string {
  return `
    <svg class="status-icon" viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path d="${STATUS_ICON_PATHS[name]}"/>
    </svg>
  `;
}
