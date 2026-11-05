"use client";

import { useState, type ReactNode } from "react";
import {
  CircleHelp,
  FastForward,
  Maximize2,
  PanelRight,
  Play,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanvas } from "@/lib/store";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { cn } from "@/lib/utils";

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({
  onOpenPicker,
  onFit,
  dockOpen,
  onToggleDock,
}: {
  onOpenPicker: () => void;
  onFit: () => void;
  dockOpen: boolean;
  onToggleDock: () => void;
}) {
  const projectName = useCanvas((state) => state.projectName);
  const setProjectName = useCanvas((state) => state.setProjectName);
  const undo = useCanvas((state) => state.undo);
  const redo = useCanvas((state) => state.redo);
  const past = useCanvas((state) => state.past.length);
  const future = useCanvas((state) => state.future.length);
  const runSelected = useCanvas((state) => state.runSelected);
  const runFromHere = useCanvas((state) => state.runFromHere);
  const loadTemplate = useCanvas((state) => state.loadTemplate);
  const clearCanvas = useCanvas((state) => state.clearCanvas);
  const nodeCount = useCanvas((state) => state.nodes.length);
  const canRun = useCanvas((state) =>
    state.nodes.some((node) => node.selected && node.type === "generate"),
  );
  const [help, setHelp] = useState(false);
  const [pending, setPending] = useState<
    null | { kind: "template"; id: TemplateId } | { kind: "clear" }
  >(null);

  function askTemplate(id: TemplateId) {
    if (nodeCount === 0) loadTemplate(id);
    else setPending({ kind: "template", id });
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 md:gap-2 md:px-3">
      <span className="grid size-7 place-items-center rounded-md bg-[#dff25a] text-[#1a1c08]" aria-hidden>
        <svg viewBox="0 0 16 16" className="size-4" fill="none">
          <path d="M2 11c2.2-4 3.2-4 6-4s3.8 0 6 4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 7.5c2.2-4 3.2-4 6-4s3.8 0 6 4" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
        </svg>
      </span>
      <div className="hidden text-sm font-semibold sm:block">页织</div>
      <Input
        value={projectName}
        onChange={(event) => setProjectName(event.target.value)}
        aria-label="项目名称"
        placeholder="未命名项目"
        className="h-7 w-28 border-transparent bg-transparent px-1.5 shadow-none md:w-44"
      />
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" onClick={onOpenPicker}>
          添加
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            模板
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {TEMPLATES.map((template) => (
              <DropdownMenuItem key={template.id} onClick={() => askTemplate(template.id)}>
                <span className="flex flex-col items-start">
                  <span>{template.name}</span>
                  <span className="text-xs text-muted-foreground">{template.description}</span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPending({ kind: "clear" })}>
              清空画布
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label="撤销 Ctrl Z" onClick={undo} disabled={past === 0}>
          <Undo2 />
        </IconButton>
        <IconButton label="重做 Ctrl Shift Z" onClick={redo} disabled={future === 0}>
          <Redo2 />
        </IconButton>
        <IconButton label="适应画布" onClick={onFit}>
          <Maximize2 />
        </IconButton>
        <IconButton label={dockOpen ? "收起预览" : "打开预览"} onClick={onToggleDock}>
          <PanelRight />
        </IconButton>
        <IconButton label="快捷键和用法" onClick={() => setHelp(true)}>
          <CircleHelp />
        </IconButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canRun}
          onClick={() => void runSelected()}
        >
          <Play />
          <span className="hidden md:inline">运行选中</span>
        </Button>
        <Button type="button" size="sm" onClick={() => void runFromHere()}>
          <FastForward />
          <span className="hidden md:inline">从此运行</span>
        </Button>
      </div>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>怎么用这块画布</DialogTitle>
            <DialogDescription>
              节点从左往右读。生成时会把连到它上游的简报、风格、布局和组件当成上下文。
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li>双击空白处添加节点，或用工具栏的「添加」。</li>
            <li>从右侧圆点拖到下一个节点。简报、风格、布局、组件进生成；生成进代码，代码进预览。</li>
            <li>点生成节点上的「运行」，或用「运行选中 / 从此运行」。</li>
            <li>代码节点里可以直接改，预览会跟着变。再运行会覆盖手改。</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Ctrl Z 撤销，Ctrl Shift Z 重做。没有模型密钥时，运行会按节点内容本地合成页面。
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.kind === "clear" ? "清空画布？" : "载入模板？"}</DialogTitle>
            <DialogDescription>
              当前画布会被换掉。可以用撤销退回去。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pending?.kind === "template") loadTemplate(pending.id);
                if (pending?.kind === "clear") clearCanvas();
                setPending(null);
              }}
            >
              {pending?.kind === "clear" ? "清空" : "载入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
