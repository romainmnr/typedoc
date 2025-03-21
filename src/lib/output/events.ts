import type { ProjectReflection } from "../models/ProjectReflection.js";
import {
    type DeclarationReflection,
    type DocumentReflection,
    Reflection,
    type ReflectionKind,
} from "../models/index.js";
import type { PageDefinition, PageKind, RouterTarget } from "./router.js";

/**
 * An event emitted by the {@link Renderer} class at the very beginning and
 * ending of the entire rendering process.
 *
 * @see {@link Renderer.EVENT_BEGIN}
 * @see {@link Renderer.EVENT_END}
 */
export class RendererEvent {
    /**
     * The project the renderer is currently processing.
     */
    readonly project: ProjectReflection;

    /**
     * The path of the directory the documentation should be written to.
     */
    readonly outputDirectory: string;

    /**
     * A list of all pages that will be generated.
     */
    pages: PageDefinition[];

    /**
     * Triggered before the renderer starts rendering a project.
     * @event
     */
    static readonly BEGIN = "beginRender";

    /**
     * Triggered after the renderer has written all documents.
     * @event
     */
    static readonly END = "endRender";

    constructor(
        outputDirectory: string,
        project: ProjectReflection,
        pages: PageDefinition[],
    ) {
        this.outputDirectory = outputDirectory;
        this.project = project;
        this.pages = pages;
    }
}

export interface PageHeading {
    link: string;
    text: string;
    level?: number;
    kind?: ReflectionKind;
    classes?: string;
}

/**
 * An event emitted by the {@link Renderer} class before and after the
 * markup of a page is rendered.
 *
 * @see {@link Renderer.EVENT_BEGIN_PAGE}
 * @see {@link Renderer.EVENT_END_PAGE}
 */
export class PageEvent<out Model extends RouterTarget = RouterTarget> {
    /**
     * The project the renderer is currently processing.
     */
    project!: ProjectReflection;

    /**
     * The filename the page will be written to.
     */
    filename!: string;

    /**
     * The url this page will be located at.
     */
    url!: string;

    /**
     * The type of page this is.
     */
    pageKind!: PageKind;

    /**
     * The model that should be rendered on this page.
     */
    readonly model: Model;

    /**
     * The final html content of this page.
     *
     * Should be rendered by layout templates and can be modified by plugins.
     */
    contents?: string;

    /**
     * Links to content within this page that should be rendered in the page navigation.
     * This is built when rendering the document content.
     */
    pageHeadings: PageHeading[] = [];

    /**
     * Sections of the page, generally set by `@group`s
     */
    pageSections = [
        {
            title: "",
            headings: this.pageHeadings,
        },
    ];

    /**
     * Start a new section of the page. Sections are collapsible within
     * the "On This Page" sidebar.
     */
    startNewSection(title: string) {
        this.pageHeadings = [];
        this.pageSections.push({
            title,
            headings: this.pageHeadings,
        });
    }

    /**
     * Triggered before a document will be rendered.
     * @event
     */
    static readonly BEGIN = "beginPage";

    /**
     * Triggered after a document has been rendered, just before it is written to disc.
     * @event
     */
    static readonly END = "endPage";

    constructor(model: Model) {
        this.model = model;
    }

    isReflectionEvent(): this is PageEvent<Reflection> {
        return this.model instanceof Reflection;
    }
}

/**
 * An event emitted when markdown is being parsed. Allows other plugins to manipulate the result.
 *
 * @see {@link MarkdownEvent.PARSE}
 */
export class MarkdownEvent {
    /**
     * The unparsed original text.
     */
    readonly originalText: string;

    /**
     * The parsed output.
     */
    parsedText: string;

    /**
     * The page that this markdown is being parsed for.
     */
    readonly page: PageEvent;

    /**
     * Triggered on the renderer when this plugin parses a markdown string.
     * @event
     */
    static readonly PARSE = "parseMarkdown";

    constructor(page: PageEvent, originalText: string, parsedText: string) {
        this.page = page;
        this.originalText = originalText;
        this.parsedText = parsedText;
    }
}

/**
 * An event emitted when the search index is being prepared.
 */
export class IndexEvent {
    /**
     * Triggered on the renderer when the search index is being prepared.
     * @event
     */
    static readonly PREPARE_INDEX = "prepareIndex";

    /**
     * May be filtered by plugins to reduce the results available.
     * Additional items *should not* be added to this array.
     *
     * If you remove an index from this array, you must also remove the
     * same index from {@link searchFields}. The {@link removeResult} helper
     * will do this for you.
     */
    searchResults: Array<DeclarationReflection | DocumentReflection>;

    /**
     * Additional search fields to be used when creating the search index.
     * `name`, `comment` and `document` may be specified to overwrite TypeDoc's search fields.
     *
     * Do not use `id` as a custom search field.
     */
    searchFields: Record<string, string>[];

    /**
     * Weights for the fields defined in `searchFields`. The default will weight
     * `name` as 10x more important than comment and document content.
     *
     * If a field added to {@link searchFields} is not added to this object, it
     * will **not** be searchable.
     *
     * Do not replace this object, instead, set new properties on it for custom search
     * fields added by your plugin.
     */
    readonly searchFieldWeights: Record<string, number> = {
        name: 10,
        comment: 1,
        document: 1,
    };

    /**
     * Remove a search result by index.
     */
    removeResult(index: number) {
        this.searchResults.splice(index, 1);
        this.searchFields.splice(index, 1);
    }

    constructor(
        searchResults: Array<DeclarationReflection | DocumentReflection>,
    ) {
        this.searchResults = searchResults;
        this.searchFields = Array.from(
            { length: this.searchResults.length },
            () => ({}),
        );
    }
}
