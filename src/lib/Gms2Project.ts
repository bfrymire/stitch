import { Gms2PipelineError, assert } from "./errors";
import fs from "./files";
import { oneline } from "./strings";
import paths from "./paths";
import { YypComponents, YypResource } from "../types/YypComponents";
import { Gms2ProjectComponents, Gms2ResourceSubclass } from "../types/Gms2ProjectComponents";
import { Gms2Option } from "./components/Gms2Option";
import { Gms2Config } from "./components/Gms2Config";
import { Gms2Folder } from "./components/Gms2Folder";
import { Gms2RoomOrder } from "./components/Gms2RoomOrder";
import { Gms2TextureGroup } from './components/Gms2TextureGroup';
import { Gms2AudioGroup } from './components/Gms2AudioGroup';
import { hydrateArray, dehydrateArray } from "./hydrate";
import { Gms2IncludedFile } from "./components/Gms2IncludedFile";
import { Gms2Resource } from "./components/Gms2Resource";
import { Gms2Sound } from "./components/resources/Gms2Sound";

export interface Gms2ProjectOptions {
  /**
   * Path to a directory in which a .yyp file can be
   * found, or directly to a .yyp file. If not set,
   * will recurse through deeper folders and attempt
   * to find a *single* .yyp file.
   */
  projectPath?: string,
  /**
   * Prevent any files from being written by
   * locking the project instance. Cannot be unlocked.
   */
  readOnly?: boolean,
}

/**
 * Convert a Gamemaker Studio 2.3+ project
 * into an internal representation that can
 * be manipulated programmatically.
 */
export class Gms2Project {

  readonly yypAbsolutePath: string;
  readonly isReadOnly: boolean;

  /** Directory containing a .git file. null means no repo, undefined means no check has occurred. */
  #gitRepoDirectory: string | null | undefined;

  /**
   * The content of the YYP file, mirroring the data structure
   * in the file but with components replaced by model instances.
   */
  #components!: Gms2ProjectComponents;

  /**
   * @param {Gms2Config|string} [options] An options object or the path
   * to the .yyp file or a parent folder containing it. If not specified, will
   * look in the current directory and all children.
   */
  constructor(options?: Gms2ProjectOptions | string) {
    // Normalize options
    options = {
      projectPath: typeof options == 'string'
        ? options
        : options?.projectPath || process.cwd(),
      readOnly: (typeof options != 'string' && options?.readOnly) || false
    };
    this.isReadOnly = options.readOnly as boolean;

    // Find the yyp filepath
    let yypPath = options.projectPath as string;
    if (!yypPath.endsWith(".yyp")) {
      const yypParentPath = yypPath;
      const yypPaths = fs.listFilesByExtensionSync(yypParentPath, 'yyp', true);
      if (yypPaths.length == 0) {
        throw new Gms2PipelineError(
          "Couldn't find the .yyp file in this project."
        );
      }
      if (yypPaths.length > 1) {
        throw new Gms2PipelineError(oneline`
          Found multiple .yyp files in the project.
          When more than one is present,
          you must specify which you want to use.
        `);
      }
      yypPath = yypPaths[0];
    }

    // Ensure the YYP file actually exists
    assert(fs.existsSync(yypPath), `YYP file does not exist: ${yypPath}`);
    this.yypAbsolutePath = paths.resolve(yypPath);

    // Require that the project is within a Git repo
    assert(this.gitRepoDirectory, `No git repo found in any parent folder. Too dangerous to proceed.`);

    // Load up all the project files into class instances for manipulation
    this.reload();
  }

  // The directory wherein this project lies.
  get absoluteDir() {
    // TODO: This is WRONG
    return paths.dirname(this.yypAbsolutePath);
  }

  get gitRepoDirectory() {
    if (typeof this.#gitRepoDirectory == 'undefined') {
      this.#gitRepoDirectory = null;
      // Look for a repo
      let path = this.absoluteDir;
      while (paths.dirname(path) != path) {
        const possibleGitPath = paths.join(path, ".git");
        if (fs.existsSync(possibleGitPath)) {
          this.#gitRepoDirectory = path;
        }
        path = paths.dirname(path);
      }
    }
    return this.#gitRepoDirectory;
  }


  /**
   * Recreate in-memory representations of the Gamemaker Project
   * using its files.
   */
  reload() {
    // Load the YYP file, store RAW (ensure field resourceType: "GMProject" exists)
    const yyp = fs.readJsonSync(this.yypAbsolutePath) as YypComponents;
    assert(yyp.resourceType == 'GMProject', 'This is not a GMS2.3+ project.');

    this.#components = {
      ...yyp,
      Options: hydrateArray(yyp.Options, Gms2Option),
      configs: new Gms2Config(yyp.configs),
      Folders: hydrateArray(yyp.Folders, Gms2Folder),
      RoomOrder: hydrateArray(yyp.RoomOrder, Gms2RoomOrder),
      TextureGroups: hydrateArray(yyp.TextureGroups, Gms2TextureGroup),
      AudioGroups: hydrateArray(yyp.AudioGroups, Gms2AudioGroup),
      IncludedFiles: hydrateArray(yyp.IncludedFiles, Gms2IncludedFile),
      resources: yyp.resources.map(Gms2Project._hydrateResource)
    };

    // TODO: Make it so that we can actually load an save a project file.

  }

  static get _resourceClassMap() {
    const classMap = {
      animcurves: Gms2Resource,    // ❌
      extensions: Gms2Resource,    // ❌
      fonts: Gms2Resource,         // ❌
      notes: Gms2Resource,         // ❌
      objects: Gms2Resource,       // ❌
      paths: Gms2Resource,         // ❌
      rooms: Gms2Resource,         // ❌
      scripts: Gms2Resource,       // ❌
      sequences: Gms2Resource,     // ❌
      shaders: Gms2Resource,       // ❌
      sounds: Gms2Sound,           // ✅
      sprites: Gms2Resource,       // ❌
      tilesets: Gms2Resource,      // ❌
      timelines: Gms2Resource,     // ❌
    } as const;
    return classMap;
  }

  static _hydrateResource(data: YypResource) {
    const resourceType = data.id.path.split('/')[0] as (keyof typeof Gms2Project._resourceClassMap);
    const subclass = Gms2Project._resourceClassMap[resourceType];
    if (!subclass) {
      throw new Gms2PipelineError(
        `No constructor for resource ${resourceType} exists.`
      );
    }
    const resource = new subclass(data, resourceType) as Gms2ResourceSubclass;
    return resource;

  }

  // TODO: TO TEST, do deep comparison of the loaded content vs. the dehydrate output

  get dehydrated(): YypComponents {
    const fields = Object.keys(this.#components) as (keyof YypComponents)[];
    const asObject: Partial<YypComponents> = {};
    for (const field of fields) {
      if(Array.isArray(this.#components[field])){
        // @ts-ignore
        asObject[field] = dehydrateArray(this.#components[field]);
      }
      else{
        const component = this.#components[field] as any;
        asObject[field] = component?.dehydrated ?? component;
      }
    }
    return asObject as YypComponents;
  }
}

